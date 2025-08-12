// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;
 
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../interfaces/common/IERC20BurnableMinter.sol";
import "../../interfaces/common/IStakePool.sol";
import "../../interfaces/Market/IMarketV2.sol";
import "../../shared/utils/Initializer.sol";
import "../../shared/utils/DelegateGuard.sol";
import "../../shared/libraries/LocalMath.sol";

/**
 * Change log:
 * 1. Remove `startup`, `setMarketOptions` and `constructor1` function,
 *    because they are no longer needed
 * 2. `Sell` event add a param `repaidDebt1e18`,
 *    which represents the amount of debt repaid for the treasury
 * 3. `Buy` event add a param `newDebt1e18`,
 *    which represents the new treasury debt
 * 4. Modified the `estimateSell` function and the `sellFor` function,
 *    when users sell RWA, part of it will be used to repay the debt for the treasury
 * 5. Optimized the `buyFor` function and the `burnFor` function
 * 6. Add `isV2` to identify the version
 * 7. Add `isPositive` and `debt` to record treasury debt
 * 8. Add `estimateBondBuy`, `bondBuy`, `repayDebt` and `constructor2` functions
 *    to support Bonds contract
 * 9. Add `RepayDebt` event
 */
contract MarketV2 is
    ContextUpgradeable,
    AccessControlEnumerableUpgradeable,
    PausableUpgradeable,
    DelegateGuard,
    Initializer,
    IMarketV2
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 public constant ADD_STABLECOIN_ROLE =
        keccak256("ADD_STABLECOIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant STARTUP_ROLE = keccak256("STARTUP_ROLE");

    // RWA token address
    IERC20BurnableMinter public override RWA;
    // prRWA token address
    IERC20BurnableMinter public override prRWA;
    // StakePool contract address
    address public override pool;

    // target funding ratio (target/10000)
    //
    // price supporting funding(PSF) = (t - p) * (c - f) / 2
    //
    // floor supporting funding(FSF) = f * t
    //
    //                              PSF
    // current funding ratio = -------------
    //                           PSF + FSF
    //
    uint32 public override target;
    // target adjusted funding ratio (targetAdjusted/10000),
    // if the current funding ratio reaches targetAjusted, f and p will be increased to bring the funding ratio back to target
    uint32 public override targetAdjusted;
    // minimum value of target
    uint32 public override minTarget;
    // maximum value of the targetAdjusted
    uint32 public override maxTargetAdjusted;
    // step value of each raise
    uint32 public override raiseStep;
    // step value of each lower
    uint32 public override lowerStep;
    // interval of each lower
    uint32 public override lowerInterval;
    // the time when ratio was last modified
    uint256 public override latestUpdateTimestamp;

    // developer address
    address public override dev;
    // fee for buying RWA
    uint32 public override buyFee;
    // fee for selling RWA
    uint32 public override sellFee;

    // the slope of the price function (1/(k * 1e18))
    uint256 public override k;
    // current RWA price
    uint256 public override c;
    // floor RWA price
    uint256 public override f;
    // floor supply,
    // if t <= p, the price of RWA will always be f
    uint256 public override p;
    // total worth
    uint256 public override w;
    //
    //     ^
    //   c |_____________/
    //     |            /|
    //     |           / |
    //   f |__________/  |
    //     |          |  |
    //     |          |  |
    //      ------------------>
    //                p  t

    // stablecoins that can be used to buy RWA
    EnumerableSetUpgradeable.AddressSet internal stablecoinsCanBuy;
    // stablecoins that can be exchanged with RWA
    EnumerableSetUpgradeable.AddressSet internal stablecoinsCanSell;
    // stablecoins decimals
    mapping(address => uint8) public override stablecoinsDecimals;

    event Buy(
        address indexed from,
        address indexed token,
        uint256 input,
        uint256 output,
        uint256 fee,
        uint256 newDebt1e18
    );

    event Realize(
        address indexed from,
        address indexed token,
        uint256 input,
        uint256 output
    );

    event Sell(
        address indexed from,
        address indexed token,
        uint256 input,
        uint256 output,
        uint256 fee,
        uint256 repaidDebt1e18
    );

    event Burn(address indexed user, uint256 amount);

    event Raise(address trigger, uint256 target, uint256 targetAdjusted);

    event Lower(uint256 target, uint256 targetAdjusted);

    event Adjust(uint256 c, uint256 f, uint256 p);

    event AdjustOptionsChanged(
        uint32 minTarget,
        uint32 maxTargetAdjusted,
        uint32 raiseStep,
        uint32 lowerStep,
        uint32 lowerInterval
    );

    event FeeOptionsChanged(address dev, uint32 buyFee, uint32 sellFee);

    event StablecoinsChanged(address token, bool buyOrSell, bool addOrDelete);

    // V2 elements
    bytes32 public constant BOND_ROLE = keccak256("BOND_ROLE");

    // a flag to mark if this contract is MarketV2
    bool public override isV2;
    // a flag to record whether debt is positive
    bool public override isPositive;
    // treasury debt
    uint256 public override debt;

    event RepayDebt(
        address indexed from,
        address indexed token,
        uint256 worth1e18
    );

    /**
     * @dev Initialize function for the upgradeable contract
     * @param _rwa - RWA token address
     * @param _pr_rwa - prRWA token address
     * @param _pool - StakePool contract address
     * @param _dev - Developer address
     */
    function initialize(
        address _rwa,
        address _pr_rwa,
        address _pool,
        address _dev
    ) public initializer {
        __Context_init();
        __AccessControlEnumerable_init();
        __Pausable_init();
        
        RWA = IERC20BurnableMinter(_rwa);
        prRWA = IERC20BurnableMinter(_pr_rwa);
        pool = _pool;
        dev = _dev;
        
        // Set default values
        isV2 = true;
        isPositive = false;
        debt = 0;
        
        // Grant admin role
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ADD_STABLECOIN_ROLE, _msgSender());
        _setupRole(MANAGER_ROLE, _msgSender());
        _setupRole(STARTUP_ROLE, _msgSender());
        
        // Default values can be updated after initialization
        buyFee = 0;
        sellFee = 0;
        minTarget = 3000;
        maxTargetAdjusted = 7000;
        raiseStep = 500;
        lowerStep = 100;
        lowerInterval = 7 days;
        
        // Initialize timestamps
        latestUpdateTimestamp = block.timestamp;
        
        initialized = true;
    }

    modifier isStarted() {
        require(f > 0 && initialized, "Market: is not started");
        _;
    }

    modifier canBuy(address token) {
        require(stablecoinsCanBuy.contains(token), "Market: invalid buy token");
        _;
    }

    modifier canSell(address token) {
        require(
            stablecoinsCanSell.contains(token),
            "Market: invalid sell token"
        );
        _;
    }

    /**
     * @dev Get the number of stablecoins that can buy RWA.
     */
    function stablecoinsCanBuyLength()
        external
        view
        override
        returns (uint256)
    {
        return stablecoinsCanBuy.length();
    }

    /**
     * @dev Get the address of the stablecoin that can buy RWA according to the index.
     * @param index - Stablecoin index
     */
    function stablecoinsCanBuyAt(uint256 index)
        external
        view
        override
        returns (address)
    {
        return stablecoinsCanBuy.at(index);
    }

    /**
     * @dev Get whether the token can be used to buy RWA.
     * @param token - Token address
     */
    function stablecoinsCanBuyContains(address token)
        external
        view
        override
        returns (bool)
    {
        return stablecoinsCanBuy.contains(token);
    }

    /**
     * @dev Get the number of stablecoins that can be exchanged with RWA.
     */
    function stablecoinsCanSellLength()
        external
        view
        override
        returns (uint256)
    {
        return stablecoinsCanSell.length();
    }

    /**
     * @dev Get the address of the stablecoin that can be exchanged with RWA,
     *      according to the index.
     * @param index - Stablecoin index
     */
    function stablecoinsCanSellAt(uint256 index)
        external
        view
        override
        returns (address)
    {
        return stablecoinsCanSell.at(index);
    }

    /**
     * @dev Get whether the token can be exchanged with RWA.
     * @param token - Token address
     */
    function stablecoinsCanSellContains(address token)
        external
        view
        override
        returns (bool)
    {
        return stablecoinsCanSell.contains(token);
    }

    /**
     * @dev Calculate current funding ratio.
     */
    function currentFundingRatio()
        public
        view
        override
        isStarted
        returns (uint256 numerator, uint256 denominator)
    {
        return currentFundingRatio(RWA.totalSupply());
    }

    /**
     * @dev Calculate current funding ratio.
     * @param _t - Total supply
     */
    function currentFundingRatio(uint256 _t)
        internal
        view
        returns (uint256 numerator, uint256 denominator)
    {
        if (_t > p) {
            uint256 temp = _t - p;
            numerator = temp * temp;
            denominator = 2 * f * _t * k + numerator;
        } else {
            denominator = 1;
        }
    }

    /**
     * @dev Estimate adjust result.
     * @param _k - Slope
     * @param _tar - Target funding ratio
     * @param _w - Total worth
     * @param _t - Total supply
     * @return success - Whether the calculation was successful
     * @return _c - Current price
     * @return _f - Floor price
     * @return _p - Point of intersection
     */
    function estimateAdjust(
        uint256 _k,
        uint256 _tar,
        uint256 _w,
        uint256 _t
    )
        public
        pure
        override
        returns (
            bool success,
            uint256 _c,
            uint256 _f,
            uint256 _p
        )
    {
        _f = (1e18 * _w - 1e14 * _w * _tar) / _t;
        uint256 temp = LocalMath.sqrt(2 * _tar * _w * _k * 1e14);
        if (_t >= temp) {
            _p = _t - temp;
            _c = (temp + _k * _f) / _k;
            // make sure the price is greater than 0
            if (_f > 0 && _c > _f) {
                success = true;
            }
        }
    }

    /**
     * @dev Estimate next raise price.
     * @return success - Whether the calculation was successful
     * @return _t - The total supply when the funding ratio reaches targetAdjusted
     * @return _c - The price when the funding ratio reaches targetAdjusted
     * @return _w - The total worth when the funding ratio reaches targetAdjusted
     * @return raisedFloorPrice - The floor price after market adjusted
     */
    function estimateRaisePrice()
        external
        view
        override
        isStarted
        returns (
            bool success,
            uint256 _t,
            uint256 _c,
            uint256 _w,
            uint256 raisedFloorPrice
        )
    {
        return estimateRaisePrice(f, k, p, target, targetAdjusted);
    }

    /**
     * @dev Estimate raise price by input value.
     * @param _f - Floor price
     * @param _k - Slope
     * @param _p - Floor supply
     * @param _tar - Target funding ratio
     * @param _tarAdjusted - Target adjusted funding ratio
     * @return success - Whether the calculation was successful
     * @return _t - The total supply when the funding ratio reaches _tar
     * @return _c - The price when the funding ratio reaches _tar
     * @return _w - The total worth when the funding ratio reaches _tar
     * @return raisedFloorPrice - The floor price after market adjusted
     */
    function estimateRaisePrice(
        uint256 _f,
        uint256 _k,
        uint256 _p,
        uint256 _tar,
        uint256 _tarAdjusted
    )
        public
        pure
        override
        returns (
            bool success,
            uint256 _t,
            uint256 _c,
            uint256 _w,
            uint256 raisedFloorPrice
        )
    {
        uint256 temp = (2 * _f * _tarAdjusted * _k) / (10000 - _tarAdjusted);
        _t = (2 * _p + temp + LocalMath.sqrt(temp * temp + 4 * temp * _p)) / 2;
        if (_t > _p) {
            temp = _t - _p;
            _c = (temp + _k * _f) / _k;
            _w = (temp * temp + 2 * _f * _t * _k) / (2 * _k * 1e18);
            // make sure the price is greater than 0
            if (_f > 0 && _c > _f) {
                // prettier-ignore
                (success, , raisedFloorPrice, ) = estimateAdjust(_k, _tar, _w, _t);
            }
        }
    }

    /**
     * @dev Adjust will call estimateAdjust and set the result to storage,
     *      if the adjustment fails, the transaction will be reverted
     * @param _t - Total supply
     */
    function adjustMustSucceed(uint256 _t) internal {
        // update timestamp
        latestUpdateTimestamp = block.timestamp;
        // prettier-ignore
        (bool success, uint256 _c, uint256 _f, uint256 _p) = estimateAdjust(k, target, w, _t);
        require(success, "Market: adjust failed");
        c = _c;
        f = _f;
        p = _p;
        emit Adjust(_c, _f, _p);
    }

    /**
     * @dev Adjust will call estimateAdjust and set the result to storage.
     * @param _t - Total supply
     * @param _trigger - Trigger user address, if it is address(0), the raise will never be triggered
     */
    function adjustAndRaise(uint256 _t, address _trigger) internal {
        // update timestamp
        latestUpdateTimestamp = block.timestamp;
        // prettier-ignore
        (bool success, uint256 _c, uint256 _f, uint256 _p) = estimateAdjust(k, target, w, _t);
        // only update the storage data when the estimate is successful
        if (success && _f >= f) {
            c = _c;
            f = _f;
            p = _p;
            emit Adjust(_c, _f, _p);
            if (_trigger != address(0) && targetAdjusted < maxTargetAdjusted) {
                uint32 raisedStep = raiseStep;
                if (targetAdjusted + raisedStep > maxTargetAdjusted) {
                    raisedStep = maxTargetAdjusted - targetAdjusted;
                }
                if (raisedStep > 0) {
                    target += raisedStep;
                    targetAdjusted += raisedStep;
                    emit Raise(_trigger, target, targetAdjusted);
                }
            }
        }
    }

    /**
     * @dev Lower target and targetAdjusted with lowerStep.
     */
    function lowerAndAdjust() public override isStarted whenNotPaused {
        lowerAndAdjust(RWA.totalSupply());
    }

    /**
     * @dev Lower target and targetAdjusted with lowerStep.
     * @param _t - Total supply
     */
    function lowerAndAdjust(uint256 _t) internal {
        if (block.timestamp > latestUpdateTimestamp && lowerInterval > 0) {
            uint32 loweredStep = (lowerStep *
                uint32(block.timestamp - latestUpdateTimestamp)) /
                lowerInterval;
            if (loweredStep > 0) {
                // update timestamp.
                latestUpdateTimestamp = block.timestamp;
                if (target == minTarget) {
                    // there is no need to lower ratio.
                    return;
                }
                if (target < loweredStep || target - loweredStep < minTarget) {
                    loweredStep = target - minTarget;
                }
                target -= loweredStep;
                targetAdjusted -= loweredStep;
                emit Lower(target, targetAdjusted);
                // check if we need to adjust again
                (uint256 n, uint256 d) = currentFundingRatio(_t);
                if (n * 10000 > d * targetAdjusted) {
                    adjustAndRaise(_t, address(0));
                }
            }
        }
    }

    /**
     * @dev Set adjust options.
     *      The caller must has MANAGER_ROLE.
     * @param _minTarget - Minimum value of target
     * @param _maxTargetAdjusted - Maximum value of the targetAdjusted
     * @param _raiseStep - Step value of each raise
     * @param _lowerStep - Step value of each lower
     * @param _lowerInterval - Interval of each lower
     */
    function setAdjustOptions(
        uint32 _minTarget,
        uint32 _maxTargetAdjusted,
        uint32 _raiseStep,
        uint32 _lowerStep,
        uint32 _lowerInterval
    ) external override onlyRole(MANAGER_ROLE) {
        require(
            _minTarget > 0 && _minTarget <= target,
            "Market: invalid minTarget"
        );
        require(
            _maxTargetAdjusted <= 10000 && _maxTargetAdjusted >= targetAdjusted,
            "Market: invalid maxTargetAdjusted"
        );
        require(_raiseStep <= 10000, "Market: raiseStep is too large");
        require(_lowerStep <= 10000, "Market: lowerStep is too large");
        minTarget = _minTarget;
        maxTargetAdjusted = _maxTargetAdjusted;
        raiseStep = _raiseStep;
        lowerStep = _lowerStep;
        lowerInterval = _lowerInterval;
        emit AdjustOptionsChanged(
            _minTarget,
            _maxTargetAdjusted,
            _raiseStep,
            _lowerStep,
            _lowerInterval
        );
    }

    /**
     * @dev Set fee options.
     *      The caller must has MANAGER_ROLE.
     * @param _dev - Dev address
     * @param _buyFee - Fee for buying RWA
     * @param _sellFee - Fee for selling RWA
     */
    function setFeeOptions(
        address _dev,
        uint32 _buyFee,
        uint32 _sellFee
    ) external override onlyRole(MANAGER_ROLE) {
        require(_dev != address(0), "Market: zero dev address");
        require(_buyFee <= 10000, "Market: invalid buyFee");
        require(_sellFee <= 10000, "Market: invalid sellFee");
        dev = _dev;
        buyFee = _buyFee;
        sellFee = _sellFee;
        emit FeeOptionsChanged(_dev, _buyFee, _sellFee);
    }

    /**
     * @dev Add a stablecoin to the whitelist that can be used to buy RWA.
     * @param token - Stablecoin address
     */
    function addBuyStablecoin(address token)
        external
        onlyRole(ADD_STABLECOIN_ROLE)
    {
        uint8 decimals = IERC20MetadataUpgradeable(token).decimals();
        require(decimals > 0, "Market: invalid token");
        stablecoinsDecimals[token] = decimals;
        stablecoinsCanBuy.add(token);
        emit StablecoinsChanged(token, true, true);
    }

    /**
     * @dev Add or Delete a stablecoin from the whitelist
     *      that can be used to buy or exchange with RWA.
     * @param token - Stablecoin address
     * @param buyOrSell - True: Buy RWA; False: Sell RWA
     * @param addOrDelete - True: Add stablecoin; False: Delete stablecoin
     */
    function manageStablecoins(
        address token,
        bool buyOrSell,
        bool addOrDelete
    ) external onlyRole(MANAGER_ROLE) {
        if (addOrDelete) {
            uint8 decimals = IERC20MetadataUpgradeable(token).decimals();
            require(decimals > 0, "Market: invalid token");
            stablecoinsDecimals[token] = decimals;
            if (buyOrSell) {
                // we need to ensure that other stable coins will not be exchanged for air coins
                // stablecoinsCanBuy[token] = decimals;
                revert("Market: please call addBuyStablecoin!");
            } else {
                stablecoinsCanSell.add(token);
            }
        } else {
            if (buyOrSell) {
                stablecoinsCanBuy.remove(token);
            } else {
                stablecoinsCanSell.remove(token);
            }
        }
        emit StablecoinsChanged(token, buyOrSell, addOrDelete);
    }

    /**
     * @dev Estimate how many RWA will be minted.
     * @param token - Stablecoin address
     * @param tokenWorth - The amount of stablecoins
     * @return amount - The amount of RWA being minted
     * @return fee - The fee charged by the developer(RWA)
     * @return worth1e18 - The amount of stablecoins(1e18)
     * @return newPrice - New price
     */
    function estimateBuy(address token, uint256 tokenWorth)
        public
        view
        override
        canBuy(token)
        isStarted
        returns (
            uint256 amount,
            uint256 fee,
            uint256 worth1e18,
            uint256 newPrice
        )
    {
        uint256 _c = c;
        uint256 _k = k;
        // convert token decimals to 18
        worth1e18 = LocalMath.convertDecimals(
            tokenWorth,
            stablecoinsDecimals[token],
            18
        );
        uint256 a = LocalMath.sqrt(_c * _c * _k * _k + 2 * worth1e18 * _k * 1e18);
        uint256 b = _c * _k;
        if (a > b) {
            uint256 _amount = a - b;
            uint256 _newPrice = (_c * _k + _amount) / _k;
            if (_newPrice > _c && _amount > 0) {
                amount = _amount;
                newPrice = _newPrice;
            }
        }
        // calculate developer fee
        fee = (amount * buyFee) / 10000;
        // calculate amount
        amount -= fee;
    }

    /**
     * @dev Estimate how many stablecoins will be needed to realize prRwa.
     * @param amount - Number of prRwa user want to realize
     * @param token - Stablecoin address
     * @return worth1e18 - The amount of stablecoins being exchanged(1e18)
     * @return worth - The amount of stablecoins being exchanged
     */
    function estimateRealize(uint256 amount, address token)
        public
        view
        override
        canBuy(token)
        isStarted
        returns (uint256 worth1e18, uint256 worth)
    {
        // calculate amount of stablecoins being exchanged at the floor price
        worth1e18 = (f * amount) / 1e18;
        // convert decimals
        uint8 decimals = stablecoinsDecimals[token];
        worth = LocalMath.convertDecimalsCeil(worth1e18, 18, decimals);
        if (decimals < 18) {
            // if decimals is less than 18, drop precision
            worth1e18 = LocalMath.convertDecimals(worth, decimals, 18);
        }
    }

    /**
     * @dev Estimate how much stablecoins user can sell.
     * @param amount - Number of RWA user want to sell
     * @param token - Stablecoin address
     * @return fee - Dev fee
     * @return worth1e18 - The amount of stablecoins being exchanged(1e18)
     * @return worth - The amount of stablecoins being exchanged
     * @return newPrice - New RWA price
     * @return repaidDebt1e18 - Debt repaid by user(1e18)
     */
    function estimateSell(uint256 amount, address token)
        public
        view
        override
        canSell(token)
        isStarted
        returns (
            uint256 fee,
            uint256 worth1e18,
            uint256 worth,
            uint256 newPrice,
            uint256 repaidDebt1e18
        )
    {
        uint256 _c = c;
        uint256 _f = f;
        uint256 _t = RWA.totalSupply();
        // calculate developer fee
        fee = (amount * sellFee) / 10000;
        // calculate amount
        amount -= fee;
        // calculate the RWA worth that can be sold with the slope
        if (_t > p) {
            uint256 available = _t - p;
            if (available <= amount) {
                uint256 _worth = ((_f + _c) * available) / (2 * 1e18);
                newPrice = _f;
                worth1e18 += _worth;
                amount -= available;
            } else {
                uint256 _newPrice = (_c * k - amount) / k;
                uint256 _worth = ((_newPrice + _c) * amount) / (2 * 1e18);
                if (_newPrice < _c && _newPrice >= _f && _worth > 0) {
                    newPrice = _newPrice;
                    worth1e18 += _worth;
                }
                amount = 0;
            }
        }
        // calculate the RWA worth that can be sold at the floor price
        if (amount > 0) {
            newPrice = _f;
            worth1e18 += (amount * _f) / 1e18;
        }
        // calculate the debt the user should pay for the treasury,
        // only needs to be paid if the debt is greater than 0
        if (isPositive && debt > 0) {
            repaidDebt1e18 = (debt * worth1e18) / w;
            worth1e18 -= repaidDebt1e18;
        }
        // convert decimals
        uint8 decimals = stablecoinsDecimals[token];
        worth = LocalMath.convertDecimals(worth1e18, 18, decimals);
        if (decimals < 18) {
            // if decimals is less than 18, drop precision
            worth1e18 = LocalMath.convertDecimals(worth, decimals, 18);
        }
    }

    /**
     * @dev Buy RWA.
     * @param token - Address of stablecoin used to buy RWA
     * @param tokenWorth - Number of stablecoins
     * @param desired - Minimum amount of RWA user want to buy
     * @return amount - Number of RWA
     * @return fee - Dev fee(RWA)
     */
    function buy(
        address token,
        uint256 tokenWorth,
        uint256 desired
    ) external whenNotPaused returns (uint256, uint256) {
        return buyFor(token, tokenWorth, desired, _msgSender());
    }

    /**
     * @dev Buy RWA for user.
     * @param token - Address of stablecoin used to buy RWA
     * @param tokenWorth - Number of stablecoins
     * @param desired - Minimum amount of RWA user want to buy
     * @param user - User address
     * @return amount - Number of RWA
     * @return fee - Dev fee(RWA)
     */
    function buyFor(
        address token,
        uint256 tokenWorth,
        uint256 desired,
        address user
    ) public whenNotPaused returns (uint256, uint256) {
        (
            uint256 amount,
            uint256 fee,
            uint256 worth1e18,
            uint256 newPrice
        ) = estimateBuy(token, tokenWorth);
        require(
            worth1e18 > 0 && amount > 0 && newPrice > 0,
            "Market: useless transaction"
        );
        require(
            amount >= desired,
            "Market: mint amount is less than desired amount"
        );
        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), tokenWorth);
        IStakePool(pool).massUpdatePools();
        RWA.mint(_msgSender(), amount);
        RWA.mint(dev, fee);
        emit Buy(user, token, tokenWorth, amount, fee, 0);
        // update current price
        c = newPrice;
        // cumulative total worth
        w += worth1e18;
        // try to raise or lower funding ratio
        maybeRaiseOrLower(user);
        return (amount, fee);
    }

    /**
     * @dev Realize RWA with floor price and equal amount of prRwa.
     * @param amount - Amount of prRwa user want to realize
     * @param token - Address of stablecoin used to realize prRwa
     * @param desired - Maximum amount of stablecoin users are willing to pay
     * @return worth - The amount of stablecoins being exchanged
     */
    function realize(
        uint256 amount,
        address token,
        uint256 desired
    ) public whenNotPaused returns (uint256) {
        return realizeFor(amount, token, desired, _msgSender());
    }

    /**
     * @dev Realize RWA with floor price and equal amount of prRwa for user.
     * @param amount - Amount of prRwa user want to realize
     * @param token - Address of stablecoin used to realize prRwa
     * @param desired - Maximum amount of stablecoin users are willing to pay
     * @param user - User address
     * @return worth - The amount of stablecoins being exchanged
     */
    function realizeFor(
        uint256 amount,
        address token,
        uint256 desired,
        address user
    ) public whenNotPaused returns (uint256) {
        (uint256 worth1e18, uint256 worth) = estimateRealize(amount, token);
        require(worth > 0, "Market: useless transaction");
        require(
            worth <= desired,
            "Market: worth is greater than desired worth"
        );
        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), worth);
        prRWA.burnFrom(_msgSender(), amount);
        IStakePool(pool).massUpdatePools();
        RWA.mint(_msgSender(), amount);
        emit Realize(user, token, worth, amount);
        // cumulative total worth
        w += worth1e18;
        // let p translate to the right
        p += amount;
        // try to lower funding ratio
        lowerAndAdjust();
        return worth;
    }

    /**
     * @dev Sell RWA.
     * @param amount - Amount of RWA user want to sell
     * @param token - Address of stablecoin used to buy RWA
     * @param desired - Minimum amount of stablecoins user want to get
     * @return worth - The amount of stablecoins being exchanged
     * @return repaidDebt1e18 - Debt repaid by user(1e18)
     * @return fee - Dev fee(RWA)
     */
    function sell(
        uint256 amount,
        address token,
        uint256 desired
    )
        external
        whenNotPaused
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return sellFor(amount, token, desired, _msgSender());
    }

    /**
     * @dev Sell RWA for user.
     * @param amount - Amount of RWA user want to sell
     * @param token - Address of stablecoin used to buy RWA
     * @param desired - Minimum amount of stablecoins user want to get
     * @param user - User address
     * @return worth - The amount of stablecoins being exchanged
     * @return repaidDebt1e18 - Debt repaid by user(1e18)
     * @return fee - Dev fee(RWA)
     */
    function sellFor(
        uint256 amount,
        address token,
        uint256 desired,
        address user
    )
        public
        whenNotPaused
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (
            uint256 fee,
            uint256 worth1e18,
            uint256 worth,
            uint256 newPrice,
            uint256 repaidDebt1e18
        ) = estimateSell(amount, token);
        require(
            worth1e18 > 0 && worth > 0 && newPrice > 0,
            "Market: useless transaction"
        );
        require(worth >= desired, "Market: worth is less than desired worth");
        IStakePool(pool).massUpdatePools();
        RWA.burnFrom(_msgSender(), amount - fee);
        RWA.transferFrom(_msgSender(), dev, fee);
        IERC20Upgradeable(token).safeTransfer(_msgSender(), worth);
        emit Sell(user, token, amount - fee, worth, fee, repaidDebt1e18);
        // update current price
        c = newPrice;
        // reduce total worth
        w -= worth1e18 + repaidDebt1e18;
        // reduce debt
        decreaseDebt(repaidDebt1e18);
        if (isPositive) {
            // make sure we don't get too much debt
            require(debt <= w, "Market: debt is too large");
        }
        // if we reach the floor price,
        // let p translate to the left
        if (newPrice == f) {
            p = RWA.totalSupply();
        }
        // try to lower funding ratio
        lowerAndAdjust();
        return (worth, repaidDebt1e18, fee);
    }

    /**
     * @dev Burn RWA.
     *      It will preferentially transfer the excess value after burning to PSL.
     * @param amount - The amount of RWA the user wants to burn
     */
    function burn(uint256 amount) external override isStarted whenNotPaused {
        burnFor(amount, _msgSender());
    }

    /**
     * @dev Burn RWA for user.
     *      It will preferentially transfer the excess value after burning to PSL.
     * @param amount - The amount of RWA the user wants to burn
     * @param user - User address
     */
    function burnFor(uint256 amount, address user)
        public
        override
        isStarted
        whenNotPaused
    {
        require(amount > 0, "Market: amount is zero");
        IStakePool(pool).massUpdatePools();
        RWA.burnFrom(_msgSender(), amount);
        uint256 _t = RWA.totalSupply();
        require(_t > 0, "Market: can't burn all rwa");
        uint256 _f = f;
        uint256 _k = k;
        uint256 _w = w;
        // x = t - p
        uint256 x = LocalMath.sqrt(2 * _w * _k * 1e18 - 2 * _f * _t * _k);
        require(x > 0, "Market: amount is too small");
        if (x < _t) {
            uint256 _c = (_f * _k + x) / _k;
            require(_c > _f, "Market: amount is too small");
            c = _c;
            p = _t - x;
        } else {
            _f = (2 * _w * _k * 1e18 - _t * _t) / (2 * _t * _k);
            uint256 _c = (_f * _k + _t) / _k;
            require(_f > f && _c > _f, "Market: burn failed");
            c = _c;
            f = _f;
            p = 0;
        }
        emit Burn(user, amount);
        // try to raise or lower funding ratio
        maybeRaiseOrLower(user);
    }

    /**
     * @dev Triggers stopped state.
     *      The caller must has MANAGER_ROLE.
     */
    function pause() external override onlyRole(MANAGER_ROLE) {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *      The caller must has MANAGER_ROLE.
     */
    function unpause() external override onlyRole(MANAGER_ROLE) {
        _unpause();
    }

    //////////////////// V2 ////////////////////

    /**
     * @dev Constructor.
     * NOTE This function can only called through delegatecall.
     * @param _bonds - Bonds contract address
     */
    function constructor2(address _bonds)
        external
        override
        isDelegateCall
        isStarted
    {
        require(!isV2, "Bonds: bad constructor2");
        isV2 = true;
        _grantRole(BOND_ROLE, _bonds);
    }

    function _increaseDebt(
        bool _isPositive,
        uint256 _debt,
        uint256 value
    ) internal pure returns (bool, uint256) {
        if (_isPositive) {
            _debt += value;
        } else {
            if (_debt > value) {
                unchecked {
                    _debt -= value;
                }
            } else {
                unchecked {
                    _debt = value - _debt;
                }
                _isPositive = true;
            }
        }
        return (_isPositive, _debt);
    }

    /**
     * @dev Increase debt and save it to storage
     * @param value - Increased value
     */
    function increaseDebt(uint256 value) internal {
        (isPositive, debt) = _increaseDebt(isPositive, debt, value);
    }

    function _decreaseDebt(
        bool _isPositive,
        uint256 _debt,
        uint256 value
    ) internal pure returns (bool, uint256) {
        if (_isPositive) {
            if (_debt > value) {
                unchecked {
                    _debt -= value;
                }
            } else {
                unchecked {
                    _debt = value - _debt;
                }
                _isPositive = false;
            }
        } else {
            _debt += value;
        }
        return (_isPositive, _debt);
    }

    /**
     * @dev Decrease debt and save it to storage
     * @param value - Decreased value
     */
    function decreaseDebt(uint256 value) internal {
        (isPositive, debt) = _decreaseDebt(isPositive, debt, value);
    }

    /**
     * @dev Repay treasury debt
     * @param token - Stablecoin address
     * @param worth - The amount of stablecoins
     */
    function repayDebt(address token, uint256 worth)
        external
        override
        canBuy(token)
        isStarted
    {
        require(worth > 0, "Market: worth is zero");
        uint256 worth1e18 = LocalMath.convertDecimals(
            worth,
            stablecoinsDecimals[token],
            18
        );
        require(worth1e18 > 0, "Market: worth1e18 is zero");
        IERC20Upgradeable(token).transferFrom(_msgSender(), address(this), worth);
        decreaseDebt(worth1e18);
        emit RepayDebt(_msgSender(), token, worth1e18);
    }

    /**
     * @dev Repay treasury debt for user.
     *      The caller must has BOND_ROLE.
     * @param user - User address
     * @param token - Stablecoin address
     * @param worth1e18 - The amount of stablecoins
     * @return worth - Repaid debt
     */
    function repayDebt1e18For(
        address user,
        address token,
        uint256 worth1e18
    )
        external
        override
        canBuy(token)
        isStarted
        onlyRole(BOND_ROLE)
        returns (uint256 worth)
    {
        require(worth1e18 > 0, "Market: worth1e18 is zero");
        worth = LocalMath.convertDecimalsCeil(
            worth1e18,
            18,
            stablecoinsDecimals[token]
        );
        require(worth > 0, "Market: worth is zero");
        IERC20Upgradeable(token).transferFrom(user, address(this), worth);
        decreaseDebt(worth1e18);
        emit RepayDebt(user, token, worth1e18);
    }

    /**
     * @dev Estimate how much the user should pay
     * @param amount - The number of RWA the user wants to buy
     * @param token - Stablecoin address
     * @param deductedPrice - The price of the treasury deduction
     * @return fee - The fee charged by the developer(RWA)
     * @return worth - The amount of stablecoins that users should pay
     * @return worth1e18 - The amount of stablecoins that users should pay(1e18)
     * @return newDebt1e18 - Newly incurred treasury debt(1e18)
     * @return newPrice - New price
     */
    function estimateBondBuy(
        uint256 amount,
        address token,
        uint256 deductedPrice
    )
        public
        view
        override
        canBuy(token)
        isStarted
        returns (
            uint256 fee,
            uint256 worth,
            uint256 worth1e18,
            uint256 newDebt1e18,
            uint256 newPrice
        )
    {
        uint256 _c = c;
        uint256 _k = k;
        // calculate new price
        newPrice = (_c * _k + amount) / _k;
        if (newPrice > _c) {
            // calculate developer fee
            fee = (amount * buyFee) / 10000;
            // calculate worth
            worth1e18 =
                (2 * _c * amount * _k + amount * amount) /
                (2 * _k * 1e18);
            // RWA purchased through bonds will be deducted part of the cost
            newDebt1e18 = (amount * deductedPrice) / 1e18;
            if (worth1e18 > newDebt1e18) {
                unchecked {
                    worth1e18 -= newDebt1e18;
                }
            } else {
                worth1e18 = 0;
            }
            // convert decimals
            uint8 decimals = stablecoinsDecimals[token];
            worth = LocalMath.convertDecimalsCeil(worth1e18, 18, decimals);
            if (decimals < 18) {
                // if decimals is less than 18, drop precision
                worth1e18 = LocalMath.convertDecimals(worth, decimals, 18);
            }
        }
    }

    /**
     * @dev If the current funding ratio reaches targetAjusted,
     *      we will increase f and p to bring the funding ratio back to target,
     *      otherwise we will try to lower funding ratio
     * @param user - User address
     */
    function maybeRaiseOrLower(address user) internal {
        uint256 _t = RWA.totalSupply();
        (uint256 n, uint256 d) = currentFundingRatio(_t);
        if (n * 10000 > d * targetAdjusted) {
            adjustAndRaise(_t, user);
        } else {
            lowerAndAdjust(_t);
        }
    }

    /**
     * @dev Buy RWA through `Bonds` contract.
     *      The caller must has BOND_ROLE.
     * @param user - User address
     * @param token - Stablecoin address
     * @param amount - The number of RWA the user wants to buy
     * @param deductedPrice - The price of the treasury deduction
     * @param desired - The number of stablecoins that users expect to pay the most
     * @return worth - The amount of stablecoins actually paid by user
     * @return newDebt1e18 - Newly incurred treasury debt(1e18)
     * @return fee - The fee charged by the developer(RWA)
     */
    function bondBuy(
        address user,
        address token,
        uint256 amount,
        uint256 deductedPrice,
        uint256 desired
    )
        external
        override
        whenNotPaused
        onlyRole(BOND_ROLE)
        returns (
            uint256 worth,
            uint256 newDebt1e18,
            uint256 fee
        )
    {
        uint256 worth1e18;
        uint256 newPrice;
        (fee, worth, worth1e18, newDebt1e18, newPrice) = estimateBondBuy(
            amount,
            token,
            deductedPrice
        );
        require(
            worth1e18 > 0 && worth > 0 && amount > 0 && newPrice > 0,
            "Market: useless transaction"
        );
        require(worth <= desired, "Market: worth exceeds desired worth");
        IERC20Upgradeable(token).transferFrom(user, address(this), worth);
        IStakePool(pool).massUpdatePools();
        RWA.mint(_msgSender(), amount - fee);
        RWA.mint(dev, fee);
        emit Buy(user, token, worth, amount - fee, fee, newDebt1e18);
        // update current price
        c = newPrice;
        // cumulative total worth
        w += worth1e18 + newDebt1e18;
        // cumulative treasury debt
        // NOTE: the deducted part is the new debt of the treasury
        increaseDebt(newDebt1e18);
        if (isPositive) {
            // make sure we don't get too much debt
            require(debt <= w, "Market: debt is too large");
        }
        // try to raise or lower funding ratio
        maybeRaiseOrLower(user);
    }

    //////////////////// V2 ////////////////////
}
