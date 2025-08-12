// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/common/IHelper.sol";
import "../interfaces/common/IMarket.sol";
import "../interfaces/common/IBank.sol";
import "../interfaces/common/IStakePool.sol";

contract Helper is Context, IHelper {
    using SafeERC20 for IERC20;

    // RWA token address.
    IERC20 public override RWA;
    // prRwa token address.
    IERC20 public override prRwa;
    // STABLE_RWA token address.
    IERC20 public override StableRwa;
    // Market contract address.
    address public override market;
    // Bank contract address.
    address public override bank;
    // Pool contract address.
    address public override pool;

    constructor(
        IERC20 _rwa,
        IERC20 _pr_rwa,
        IERC20 _stable_rwa,
        address _market,
        address _bank,
        address _pool
    ) {
        RWA = _rwa;
        prRwa = _pr_rwa;
        StableRwa = _stable_rwa;
        market = _market;
        bank = _bank;
        pool = _pool;
    }

    /**
     * @dev Invest stablecoin to ONC.
     *      1. buy RWA with stablecoin
     *      2. stake RWA to pool
     *      3. borrow STABLE_RWA(if needed)
     *      4. buy RWA with STABLE_RWA(if needed)
     *      5. stake RWA to pool(if needed)
     * @param token - Stablecoin address
     * @param tokenWorth - Amount of stablecoin
     * @param desired - Minimum amount of RWA user want to buy
     * @param borrow - Whether to borrow STABLE_RWA
     */
    function invest(
        address token,
        uint256 tokenWorth,
        uint256 desired,
        bool borrow
    ) public override {
        IERC20(token).safeTransferFrom(_msgSender(), address(this), tokenWorth);
        IERC20(token).approve(address(market), tokenWorth);
        (uint256 rwa, ) = IMarket(market).buyFor(
            token,
            tokenWorth,
            desired,
            _msgSender()
        );
        RWA.approve(address(pool), rwa);
        IStakePool(pool).depositFor(0, rwa, _msgSender());
        if (borrow) {
            borrowAndInvest((rwa * IMarket(market).f()) / 1e18);
        }
    }

    /**
     * @dev Reinvest stablecoin to ONC.
     *      1. realize prRwa with stablecoin
     *      2. stake RWA to pool
     * @param token - Stablecoin address
     * @param amount - prRwa amount
     * @param desired -  Maximum amount of stablecoin users are willing to pay(used to realize prRwa)
     */
    function reinvest(
        address token,
        uint256 amount,
        uint256 desired
    ) external override {
        prRwa.transferFrom(_msgSender(), address(this), amount);
        (, uint256 worth) = IMarket(market).estimateRealize(amount, token);
        IERC20(token).safeTransferFrom(_msgSender(), address(this), worth);
        IERC20(token).approve(address(market), worth);
        prRwa.approve(address(market), amount);
        IMarket(market).realizeFor(amount, token, desired, _msgSender());
        RWA.approve(address(pool), amount);
        IStakePool(pool).depositFor(0, amount, _msgSender());
    }

    /**
     * @dev Borrow STABLE_RWA and invest to ONC.
     *      1. borrow STABLE_RWA
     *      2. buy RWA with STABLE_RWA
     *      3. stake RWA to pool
     * @param amount - Amount of STABLE_RWA
     */
    function borrowAndInvest(uint256 amount) public override {
        (uint256 borrowed, ) = IBank(bank).borrowFrom(_msgSender(), amount);
        StableRwa.approve(address(market), borrowed);
        (uint256 rwa, ) = IMarket(market).buyFor(
            address(StableRwa),
            borrowed,
            0,
            _msgSender()
        );
        RWA.approve(address(pool), rwa);
        IStakePool(pool).depositFor(0, rwa, _msgSender());
    }
}
