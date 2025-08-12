// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./IERC20BurnableMinter.sol";

interface IBank {
    // STABLE_RWA token address
    function StableRwa() external view returns (IERC20BurnableMinter);

    // Market contract address
    function market() external view returns (address);

    // StakePool contract address
    function pool() external view returns (address);

    // helper contract address
    function helper() external view returns (address);

    // user debt
    function debt(address user) external view returns (uint256);

    // developer address
    function dev() external view returns (address);

    // fee for borrowing STABLE_RWA
    function borrowFee() external view returns (uint32);

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
    ) external;

    /**
     * @dev Set bank options.
     *      The caller must be owner.
     * @param _dev - Developer address
     * @param _borrowFee - Fee for borrowing STABLE_RWA
     */
    function setOptions(address _dev, uint32 _borrowFee) external;

    /**
     * @dev Calculate the amount of RWA that can be withdrawn.
     * @param user - User address
     */
    function withdrawable(address user) external view returns (uint256);

    /**
     * @dev Calculate the amount of RWA that can be withdrawn.
     * @param user - User address
     * @param amountRWA - User staked RWA amount
     */
    function withdrawable(address user, uint256 amountRWA)
        external
        view
        returns (uint256);

    /**
     * @dev Calculate the amount of STABLE_RWA that can be borrowed.
     * @param user - User address
     */
    function available(address user) external view returns (uint256);

    /**
     * @dev Borrow STABLE_RWA.
     * @param amount - The amount of STABLE_RWA
     * @return borrowed - Borrowed STABLE_RWA
     * @return fee - Borrow fee
     */
    function borrow(uint256 amount)
        external
        returns (uint256 borrowed, uint256 fee);

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
        returns (uint256 borrowed, uint256 fee);

    /**
     * @dev Repay STABLE_RWA.
     * @param amount - The amount of STABLE_RWA
     */
    function repay(uint256 amount) external;

    /**
     * @dev Triggers stopped state.
     *      The caller must be owner.
     */
    function pause() external;

    /**
     * @dev Returns to normal state.
     *      The caller must be owner.
     */
    function unpause() external;
}