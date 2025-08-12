// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

abstract contract Initializer {
    bool public initialized;

    modifier isUninitialized() {
        require(!initialized, "Initializer: initialized");
        _;
        initialized = true;
    }

    modifier isInitialized() {
        require(initialized, "Initializer: uninitialized");
        _;
    }
}
