// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../interfaces/common/IERC20BurnableMinter.sol";

import "../../shared/utils/Initializer.sol";
import "../../shared/utils/DelegateGuard.sol";
import "../../interfaces/common/IStakePool.sol";
import "../../interfaces/common/IBank.sol";

// The stakepool will mint prRWA according to the total supply of RWA and
// then distribute it to all users according to the amount of RWA deposited by each user.
contract StakePool is Ownable, Initializer, DelegateGuard, IStakePool {
    using SafeERC20 for IERC20;

    // The RWA token
    IERC20 public override RWA;
    // The prRWA token
    IERC20BurnableMinter public override prRWA;
    // The bank contract
    address public override bank;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public override totalAllocPoint = 0;

    // Daily minted RWA as a percentage of RWA total supply.
    uint32 public override mintPercentPerDay = 0;
    // How many blocks are there in a day.
    uint256 public override blocksPerDay = 0;

    // Developer address.
    address public override dev;
    // Withdraw fee(RWA).
    uint32 public override withdrawFee = 0;
    // Mint fee(prRwa).
    uint32 public override mintFee = 0;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);

    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        uint256 fee
    );

    event OptionsChanged(
        uint32 mintPercentPerDay,
        uint256 blocksPerDay,
        address dev,
        uint32 withdrawFee,
        uint32 mintFee
    );

    // Constructor.
    function constructor1(
        IERC20 _rwa,
        IERC20BurnableMinter _pr_rwa,
        address _bank,
        address _owner
    ) external override isDelegateCall isUninitialized {
        RWA = _rwa;
        prRWA = _pr_rwa;
        bank = _bank;
        _transferOwnership(_owner);
    }

    function poolLength() external view override returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) external override isInitialized onlyOwner {
        // when _pid is 0, it is RWA pool
        if (poolInfo.length == 0) {
            require(
                address(_lpToken) == address(RWA),
                "StakePool: invalid lp token"
            );
        }

        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint + _allocPoint;
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                allocPoint: _allocPoint,
                lastRewardBlock: block.number,
                accPerShare: 0
            })
        );
    }

    // Update the given pool's prRwa allocation point. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external override isInitialized onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint =
            totalAllocPoint -
            poolInfo[_pid].allocPoint +
            _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Set options. Can only be called by the owner.
    function setOptions(
        uint32 _mintPercentPerDay,
        uint256 _blocksPerDay,
        address _dev,
        uint32 _withdrawFee,
        uint32 _mintFee,
        bool _withUpdate
    ) public override onlyOwner {
        require(
            _mintPercentPerDay <= 10000,
            "StakePool: mintPercentPerDay is too large"
        );
        require(_blocksPerDay > 0, "StakePool: blocksPerDay is zero");
        require(_dev != address(0), "StakePool: zero dev address");
        require(_withdrawFee <= 10000, "StakePool: invalid withdrawFee");
        require(_mintFee <= 10000, "StakePool: invalid mintFee");
        if (_withUpdate) {
            massUpdatePools();
        }
        mintPercentPerDay = _mintPercentPerDay;
        blocksPerDay = _blocksPerDay;
        dev = _dev;
        withdrawFee = _withdrawFee;
        mintFee = _mintFee;
        emit OptionsChanged(
            _mintPercentPerDay,
            _blocksPerDay,
            _dev,
            _withdrawFee,
            _mintFee
        );
    }

    // View function to see pending prRwas on frontend.
    function pendingRewards(uint256 _pid, address _user)
        external
        view
        override
        isInitialized
        returns (uint256)
    {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accPerShare = pool.accPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 pendingReward = (RWA.totalSupply() *
                1e12 *
                mintPercentPerDay *
                (block.number - pool.lastRewardBlock) *
                pool.allocPoint) / (10000 * blocksPerDay * totalAllocPoint);
            accPerShare += pendingReward / lpSupply;
        }
        return (user.amount * accPerShare) / 1e12 - user.rewardDebt;
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public override {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 mintReward = (RWA.totalSupply() *
            mintPercentPerDay *
            (block.number - pool.lastRewardBlock) *
            pool.allocPoint) / (10000 * blocksPerDay * totalAllocPoint);
        if (mintReward == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 mintFeeAmount = (mintReward * mintFee) / 10000;
        uint256 mintAmount = mintReward - mintFeeAmount;
        prRWA.mint(address(this), mintAmount);
        prRWA.mint(dev, mintFeeAmount);
        pool.accPerShare += (mintReward * 1e12) / lpSupply;
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to StakePool for prRwa allocation.
    function deposit(uint256 _pid, uint256 _amount) external override {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_msgSender()];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accPerShare) /
                1e12 -
                user.rewardDebt;
            if (pending > 0) {
                prRWA.transfer(_msgSender(), pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(
                address(_msgSender()),
                address(this),
                _amount
            );
            user.amount += _amount;
        }
        user.rewardDebt = (user.amount * pool.accPerShare) / 1e12;
        emit Deposit(_msgSender(), _pid, _amount);
    }

    // Deposit LP tokens to StakePool for user for prRwa allocation.
    function depositFor(
        uint256 _pid,
        uint256 _amount,
        address _user
    ) external override {
        require(_amount > 0, "StakePool: zero amount");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        updatePool(_pid);
        pool.lpToken.safeTransferFrom(
            address(_msgSender()),
            address(this),
            _amount
        );
        user.amount += _amount;
        user.rewardDebt = (user.amount * pool.accPerShare) / 1e12;
        emit Deposit(_user, _pid, _amount);
    }

    // Withdraw LP tokens from StakePool.
    function withdraw(uint256 _pid, uint256 _amount) external override {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_msgSender()];
        require(user.amount >= _amount, "StakePool: exceeds user amount");
        updatePool(_pid);
        uint256 pending = (user.amount * pool.accPerShare) /
            1e12 -
            user.rewardDebt;
        if (pending > 0) {
            prRWA.transfer(_msgSender(), pending);
        }
        if (_amount > 0) {
            user.amount -= _amount;
            uint256 withdrawFeeAmount = (_amount * withdrawFee) / 10000;
            uint256 withdrawAmount = _amount - withdrawFeeAmount;
            if (withdrawFeeAmount > 0) {
                pool.lpToken.safeTransfer(dev, withdrawFeeAmount);
            }
            pool.lpToken.safeTransfer(_msgSender(), withdrawAmount);
            emit Withdraw(_msgSender(), _pid, _amount, withdrawFeeAmount);
        }
        user.rewardDebt = (user.amount * pool.accPerShare) / 1e12;
    }

    // Claim reward.
    function claim(uint256 _pid) external override {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_msgSender()];
        updatePool(_pid);
        uint256 pending = (user.amount * pool.accPerShare) /
            1e12 -
            user.rewardDebt;
        if (pending > 0) {
            prRWA.transfer(_msgSender(), pending);
        }
        user.rewardDebt = (user.amount * pool.accPerShare) / 1e12;
    }

    // Claim reward for user.
    function claimFor(uint256 _pid, address _user) external override {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        updatePool(_pid);
        uint256 pending = (user.amount * pool.accPerShare) /
            1e12 -
            user.rewardDebt;
        if (pending > 0) {
            prRWA.transfer(_user, pending);
        }
        user.rewardDebt = (user.amount * pool.accPerShare) / 1e12;
    }
}
