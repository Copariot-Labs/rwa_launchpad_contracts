// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/common/IERC20BurnableMinter.sol";

contract RWA is Context, Ownable, ERC20, IERC20BurnableMinter {
    /**
     * See {ERC20-constructor}.
     */
    constructor() ERC20("RWA", "RWA") {}

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller is the owner.
     */
    function mint(address to, uint256 amount)
        public
        virtual
        override
        onlyOwner
    {
        _mint(to, amount);
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     *
     * Requirements:
     *
     * - the caller is the owner.
     */
    function burn(uint256 amount) public virtual override onlyOwner {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller is the owner.
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address account, uint256 amount)
        public
        virtual
        override
        onlyOwner
    {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }
}