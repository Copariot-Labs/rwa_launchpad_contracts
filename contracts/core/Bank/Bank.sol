// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../../interfaces/common/IERC20BurnableMinter.sol";
import "../../interfaces/common/IBank.sol";
import "../../interfaces/common/IMarket.sol";
import "../../interfaces/common/IStakePool.sol";

import "../../shared/utils/Initializer.sol";
import "../../shared/utils/DelegateGuard.sol";

contract Bank is Context, Ownable, Pausable, Initializer, DelegateGuard, IBank {
    // STABLE_RWA token address
    IERC20BurnableMinter public override StableRwa;
    // Market contract address
    address public override market;
    // StakePool contract address
    address public override pool;
    // helper contract address
    address public override helper;

    // user debt
    mapping(address => uint256) public override debt;

    // developer address
    address public override dev;
    // fee for borrowing STABLE_RWA
    uint32 public override borrowFee;

    event OptionsChanged(address dev, uint32 borrowFee);

    event Borrow(address user, uint256 amount, uint256 fee);

    event Repay(address user, uint256 amount);

    modifier onlyHelper() {
        require(_msgSender() == helper, "Bank: only helper");
        _;
    }

    /**
     * @dev Constructor.
     * NOTE This function can only called through delegatecall.
     * @param _stable_rwa - STABLE_RWA token address.
     * @param _market - Market contract address.
     * @param _pool - StakePool contract address.
     * @param _helper - Helper contract address.
     * @param _owner - Owner address.
     */
    function constructor1(
        IERC20BurnableMinter _stable_rwa,
        address _market,
        address _pool,
        address _helper,
        address _owner
    ) external override isDelegateCall isUninitialized {
        StableRwa = _stable_rwa;
        market = _market;
        pool = _pool;
        helper = _helper;
        _transferOwnership(_owner);
    }

    /**
     * @dev Set bank options.
     *      The caller must be owner.
     * @param _dev - Developer address
     * @param _borrowFee - Fee for borrowing STABLE_RWA
     */
    function setOptions(address _dev, uint32 _borrowFee)
        public
        override
        onlyOwner
    {
        require(_dev != address(0), "Bank: zero dev address");
        require(_borrowFee <= 10000, "Bank: invalid borrowFee");
        dev = _dev;
        borrowFee = _borrowFee;
        emit OptionsChanged(_dev, _borrowFee);
    }

    /**
     * @dev Calculate the amount of RWA that can be withdrawn.
     * @param user - User address
     */
    function withdrawable(address user)
        external
        view
        override
        isInitialized
        returns (uint256)
    {
        uint256 userDebt = debt[user];
        (uint256 amountRWA, ) = IStakePool(pool).userInfo(0, user);
        uint256 floorPrice = IMarket(market).f();
        if (amountRWA * floorPrice <= userDebt * 1e18) {
            return 0;
        }
        return (amountRWA * floorPrice - userDebt * 1e18) / floorPrice;
    }

    /**
     * @dev Calculate the amount of RWA that can be withdrawn.
     * @param user - User address
     * @param amountRWA - User staked RWA amount
     */
    function withdrawable(address user, uint256 amountRWA)
        external
        view
        override
        isInitialized
        returns (uint256)
    {
        uint256 userDebt = debt[user];
        uint256 floorPrice = IMarket(market).f();
        if (amountRWA * floorPrice <= userDebt * 1e18) {
            return 0;
        }
        return (amountRWA * floorPrice - userDebt * 1e18) / floorPrice;
    }

    /**
     * @dev Calculate the amount of STABLE_RWA that can be borrowed.
     * @param user - User address
     */
    function available(address user)
        public
        view
        override
        isInitialized
        returns (uint256)
    {
        uint256 userDebt = debt[user];
        (uint256 amountRWA, ) = IStakePool(pool).userInfo(0, user);
        uint256 floorPrice = IMarket(market).f();
        if (amountRWA * floorPrice <= userDebt * 1e18) {
            return 0;
        }
        return (amountRWA * floorPrice - userDebt * 1e18) / 1e18;
    }

    /**
     * @dev Borrow STABLE_RWA.
     * @param amount - The amount of STABLE_RWA
     * @return borrowed - Borrowed STABLE_RWA
     * @return fee - Borrow fee
     */
    function borrow(uint256 amount)
        external
        override
        isInitialized
        whenNotPaused
        returns (uint256 borrowed, uint256 fee)
    {
        return _borrowFrom(_msgSender(), amount);
    }

    /**
     * @dev Borrow STABLE_RWA from user and directly mint to msg.sender.
     *      The caller must be helper contract.
     * @param user - User address
     * @param amount - The amount of STABLE_RWA
     * @return borrowed - Borrowed STABLE_RWA
     * @return fee - Borrow fee
     */
    function borrowFrom(address user, uint256 amount)
        external
        override
        onlyHelper
        isInitialized
        whenNotPaused
        returns (uint256 borrowed, uint256 fee)
    {
        return _borrowFrom(user, amount);
    }

    /**
     * @dev Borrow STABLE_RWA from user and directly mint to msg.sender.
     */
    function _borrowFrom(address user, uint256 amount)
        internal
        returns (uint256 borrowed, uint256 fee)
    {
        require(amount > 0, "Bank: amount is zero");
        uint256 userDebt = debt[user];
        (uint256 amountRWA, ) = IStakePool(pool).userInfo(0, user);
        require(
            userDebt + amount <= (amountRWA * IMarket(market).f()) / 1e18,
            "Bank: exceeds available"
        );
        fee = (amount * borrowFee) / 10000;
        borrowed = amount - fee;
        StableRwa.mint(_msgSender(), borrowed);
        StableRwa.mint(dev, fee);
        debt[user] = userDebt + amount;
        emit Borrow(user, borrowed, fee);
    }

    /**
     * @dev Repay STABLE_RWA.
     * @param amount - The amount of STABLE_RWA
     */
    function repay(uint256 amount)
        external
        override
        isInitialized
        whenNotPaused
    {
        require(amount > 0, "Bank: amount is zero");
        uint256 userDebt = debt[_msgSender()];
        require(userDebt >= amount, "Bank: exceeds debt");
        StableRwa.burnFrom(_msgSender(), amount);
        unchecked {
            debt[_msgSender()] = userDebt - amount;
        }
        emit Repay(_msgSender(), amount);
    }

    /**
     * @dev Triggers stopped state.
     *      The caller must be owner.
     */
    function pause() external override onlyOwner {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *      The caller must be owner.
     */
    function unpause() external override onlyOwner {
        _unpause();
    }
}
