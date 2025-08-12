// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/common/IMarket.sol";
import "../shared/libraries/LocalMath.sol";

contract GenesisLaunchAuction is Context, Ownable {
    using SafeERC20 for IERC20;

    // a flag to mark whitelist user
    uint256 public constant EXISTS_IN_WHITELIST = type(uint256).max;

    // whitelist phase start time
    uint256 public whitelistEnabledAt;
    // public offering phase start time
    uint256 public publicOfferingEnabledAt;
    // init phase start time
    uint256 public initAt;
    // unlock phase start time
    uint256 public unlockAt;
    // a flag to mark if it has been initialized
    bool public initialized = false;

    // whitelist price(1e6)
    uint256 public whitelistPrice;
    // public offering price(1e6)
    uint256 public publicOfferingPrice;
    // soft USD cap,
    // if the final USD cap does not reach softCap, the market will not start
    uint256 public softCap;
    // hard USD cap,
    // the final USD cap will not exceed hardCap
    uint256 public hardCap;
    // the amount of usdc that a whitelist user can buy
    uint256 public whitelistMaxCapPerUser;

    // RWA token address
    IERC20 public RWA;
    // USDC token address
    IERC20 public USDC;
    // Market contract address
    IMarket public market;

    // the total number of whitelist users raised
    uint256 public whitelistTotalShares;
    // list of whitelist users
    address[] public whitelist;
    // shares of each whitelist user
    mapping(address => uint256) public whitelistSharesOf;
    // the total number of public offering users raised
    uint256 public publicOfferingTotalShares;
    // shares of each public offering user
    mapping(address => uint256) public publicOfferingSharesOf;

    modifier beforeWhiteList() {
        require(
            !initialized && block.timestamp < whitelistEnabledAt,
            "GLA: before whitelist"
        );
        _;
    }

    modifier whitelistEnabled() {
        require(
            !initialized &&
                block.timestamp >= whitelistEnabledAt &&
                block.timestamp < publicOfferingEnabledAt,
            "GLA: whitelist enabled"
        );
        _;
    }

    modifier publicOfferingEnabled() {
        require(
            !initialized &&
                block.timestamp >= publicOfferingEnabledAt &&
                block.timestamp < initAt,
            "GLA: public offering enabled"
        );
        _;
    }

    modifier initializeEnabled() {
        require(
            !initialized &&
                block.timestamp >= initAt &&
                block.timestamp < unlockAt,
            "GLA: initialize enabled"
        );
        _;
    }

    modifier isInitialized() {
        require(initialized, "GLA: is initialized");
        _;
    }

    modifier isUnlocked() {
        require(
            !initialized && block.timestamp >= unlockAt,
            "GLA: is unlocked"
        );
        _;
    }

    constructor(
        IERC20 _rwa,
        IERC20 _USDC,
        IMarket _market,
        uint256 _beforeWhitelistInterval,
        uint256 _whitelistInterval,
        uint256 _publicOfferingInterval,
        uint256 _initInterval,
        uint256 _whitelistPrice,
        uint256 _publicOfferingPrice,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _whitelistMaxCapPerUser
    ) {
        require(
            _beforeWhitelistInterval > 0 &&
                _whitelistInterval > 0 &&
                _publicOfferingInterval > 0 &&
                _initInterval > 0 &&
                _whitelistPrice > 0 &&
                _publicOfferingPrice > 0 &&
                _softCap > 0 &&
                _hardCap > _softCap &&
                _whitelistMaxCapPerUser > 0,
            "GLA: invalid constructor args"
        );
        RWA = _rwa;
        USDC = _USDC;
        market = _market;
        whitelistEnabledAt = block.timestamp + _beforeWhitelistInterval;
        publicOfferingEnabledAt = whitelistEnabledAt + _whitelistInterval;
        initAt = publicOfferingEnabledAt + _publicOfferingInterval;
        unlockAt = initAt + _initInterval;
        whitelistPrice = _whitelistPrice;
        publicOfferingPrice = _publicOfferingPrice;
        softCap = _softCap;
        hardCap = _hardCap;
        whitelistMaxCapPerUser = _whitelistMaxCapPerUser;
    }

    /**
     * @dev Get whitelist length.
     */
    function whitelistLength() external view returns (uint256) {
        return whitelist.length;
    }

    /**
     * @dev Get whitelist total supply.
     */
    function whitelistTotalSupply() public view returns (uint256) {
        return (whitelistTotalShares * 1e6) / whitelistPrice;
    }

    /**
     * @dev Get public offering total supply.
     */
    function publicOfferingTotalSupply() public view returns (uint256) {
        return (publicOfferingTotalShares * 1e6) / publicOfferingPrice;
    }

    /**
     * @dev Get total supply.
     */
    function totalSupply() public view returns (uint256) {
        return whitelistTotalSupply() + publicOfferingTotalSupply();
    }

    /**
     * @dev Get total USD cap.
     */
    function totalCap() public view returns (uint256) {
        return whitelistTotalShares + publicOfferingTotalShares;
    }

    /**
     * @dev Get whitelist price(1e18).
     */
    function getWhitelistPrice() external view returns (uint256) {
        return whitelistPrice * 1e12;
    }

    /**
     * @dev Get public offering price(1e18).
     */
    function getPublicOfferingPrice() external view returns (uint256) {
        return publicOfferingPrice * 1e12;
    }

    /**
     * @dev Get whitelist total supply(1e18).
     */
    function getWhitelistTotalSupply() external view returns (uint256) {
        return whitelistTotalSupply() * 1e12;
    }

    /**
     * @dev Get public offering total supply(1e18).
     */
    function getPublicOfferingTotalSupply() external view returns (uint256) {
        return publicOfferingTotalSupply() * 1e12;
    }

    /**
     * @dev Get total supply(1e18).
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply() * 1e12;
    }

    /**
     * @dev Get the current phase enumeration.
     */
    function getPhase() external view returns (uint8) {
        if (initialized) {
            // initialized
            return 4;
        } else {
            if (block.timestamp < whitelistEnabledAt) {
                // before whitelist phase
                return 0;
            } else if (
                block.timestamp >= whitelistEnabledAt &&
                block.timestamp < publicOfferingEnabledAt
            ) {
                // whitlist phase
                return 1;
            } else if (
                block.timestamp >= publicOfferingEnabledAt &&
                block.timestamp < initAt
            ) {
                // public offering phase
                return 2;
            } else if (
                block.timestamp >= initAt && block.timestamp < unlockAt
            ) {
                // init phase
                return 3;
            } else {
                // unlock phase
                return 5;
            }
        }
    }

    /**
     * @dev Add whitelist user to storage.
     *      The caller must be owner.
     * NOTE Please make sure whitelistLength() * whitelistMaxCapPerUser <= hardCap.
     * @param users - Whitelist user address.
     */
    function addWhitelist(address[] memory users)
        external
        beforeWhiteList
        onlyOwner
    {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (whitelistSharesOf[user] == 0) {
                whitelistSharesOf[user] = EXISTS_IN_WHITELIST;
                whitelist.push(user);
            }
        }
    }

    /**
     * @dev Whitelist user buy RWA.
     * @param amount - The amount of USDC.
     */
    function whitelistBuy(uint256 amount) external whitelistEnabled {
        require(amount > 0, "GLA: zero amount");
        uint256 shares = whitelistSharesOf[_msgSender()];
        require(shares != 0, "GLA: invalid whitelist user");
        shares = shares == EXISTS_IN_WHITELIST ? 0 : shares;
        uint256 maxCap = whitelistMaxCapPerUser - shares;
        if (amount > maxCap) {
            amount = maxCap;
        }
        require(amount > 0, "GLA: zero amount");
        USDC.safeTransferFrom(_msgSender(), address(this), amount);
        whitelistTotalShares += amount;
        whitelistSharesOf[_msgSender()] = shares + amount;
    }

    /**
     * @dev Public offering user buy RWA.
     * @param amount - The amount of USDC.
     */
    function publicOfferingBuy(uint256 amount) external publicOfferingEnabled {
        require(amount > 0, "GLA: zero amount");
        uint256 maxCap = hardCap - totalCap();
        if (amount > maxCap) {
            amount = maxCap;
        }
        require(amount > 0, "GLA: zero amount");
        USDC.safeTransferFrom(_msgSender(), address(this), amount);
        publicOfferingTotalShares += amount;
        publicOfferingSharesOf[_msgSender()] += amount;

        // reach the hard cap, directly start market
        if (totalCap() >= hardCap) {
            _startup();
        }
    }

    /**
     * @dev Initialize GLA.
     *      If totalSupply reaches softCap, it will start the market,
     *      otherwise it will the enter unlock phase.
     */
    function initialize() external initializeEnabled {
        if (totalCap() >= softCap) {
            _startup();
        } else {
            unlockAt = initAt + 1;
        }
    }

    /**
     * @dev Start the market.
     */
    function _startup() internal {
        uint256 _totalSupply = getTotalSupply();
        uint256 _totalCap = totalCap();
        USDC.approve(address(market), _totalCap);
        uint256 _USDCBalance1 = USDC.balanceOf(address(this));
        uint256 _rwa_balance1 = RWA.balanceOf(address(this));
        market.startup(address(USDC), _totalCap, _totalSupply);
        uint256 _USDCBalance2 = USDC.balanceOf(address(this));
        uint256 _rwa_balance2 = RWA.balanceOf(address(this));
        require(
            _USDCBalance1 - _USDCBalance2 == _totalCap &&
                _rwa_balance2 - _rwa_balance1 == _totalSupply,
            "GLA: startup failed"
        );
        initialized = true;
    }

    /**
     * @dev Estimate how much RWA user can claim.
     */
    function estimateClaim(address user) public view returns (uint256 rwa) {
        uint256 shares = whitelistSharesOf[user];
        shares = shares == EXISTS_IN_WHITELIST ? 0 : shares;
        rwa += (shares * 1e6) / whitelistPrice;
        rwa += (publicOfferingSharesOf[user] * 1e6) / publicOfferingPrice;
        rwa *= 1e12;
    }

    /**
     * @dev Claim RWA.
     */
    function claim() external isInitialized {
        uint256 rwa = estimateClaim(_msgSender());
        require(rwa > 0, "GLA: zero rwa");
        uint256 max = RWA.balanceOf(address(this));
        RWA.transfer(_msgSender(), max < rwa ? max : rwa);
        delete whitelistSharesOf[_msgSender()];
        delete publicOfferingSharesOf[_msgSender()];
    }

    /**
     * @dev Estimate how much USDC user can withdraw.
     */
    function estimateWithdraw(address user)
        public
        view
        returns (uint256 shares)
    {
        shares = whitelistSharesOf[user];
        shares = shares == EXISTS_IN_WHITELIST ? 0 : shares;
        shares += publicOfferingSharesOf[user];
    }

    /**
     * @dev Withdraw USDC.
     */
    function withdraw() external isUnlocked {
        uint256 shares = estimateWithdraw(_msgSender());
        require(shares > 0, "GLA: zero shares");
        USDC.safeTransfer(_msgSender(), shares);
        delete whitelistSharesOf[_msgSender()];
        delete publicOfferingSharesOf[_msgSender()];
    }
}