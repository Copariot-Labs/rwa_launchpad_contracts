// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

abstract contract DelegateGuard {
    // a global variable used to determine whether it is a delegatecall
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable self = address(this);

    modifier isDelegateCall() {
        require(self != address(this), "DelegateGuard: delegate call");
        _;
    }
}
