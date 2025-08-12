// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";



interface IHelper {
    // RWA token address.
    function RWA() external view returns (IERC20);

    // prRwa token address.
    function prRwa() external view returns (IERC20);

    // STABLE_RWA token address.
    function StableRwa() external view returns (IERC20);

    // STABLE_RWA token address.
    function market() external view returns (address);

    // Market contract address.
    function bank() external view returns (address);

    // Bank contract address.
    function pool() external view returns (address);

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
    ) external;

    /**
     * @dev Reinvest stablecoin to ONC.
     *      1. claim reward
     *      2. realize prRwa with stablecoin
     *      3. stake RWA to pool
     * @param token - Stablecoin address
     * @param amount - prRwa amount
     * @param desired -  Maximum amount of stablecoin users are willing to pay(used to realize prRwa)
     */
    function reinvest(
        address token,
        uint256 amount,
        uint256 desired
    ) external;

    /**
     * @dev Borrow STABLE_RWA and invest to ONC.
     *      1. borrow STABLE_RWA
     *      2. buy RWA with STABLE_RWA
     *      3. stake RWA to pool
     * @param amount - Amount of STABLE_RWA
     */
    function borrowAndInvest(uint256 amount) external;
}
