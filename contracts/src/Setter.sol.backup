// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

contract Setter {
    event ValueSet(uint256 newValue);
    event ValueReturned(uint256 value);

    uint256 public value;

    constructor() {
        value = 0;
    }

    function setValue(uint256 newValue) public {
        value = newValue;
        emit ValueSet(newValue);
    }

    function retValue() public returns (uint256) {
        emit ValueReturned(value);
        return value;
    }
}