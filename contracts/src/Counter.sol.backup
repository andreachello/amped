// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

contract Counter {
    event Incremented(uint256 count);
    event Decremented(uint256 count);
    event Returned(uint256 count);

    uint256 public count;

    constructor() {
        count = 0;
    }

    function retFunc() public returns(uint) {
        emit Returned(count);
        return count;
    }

    function increment() public {
        count++;
        emit Incremented(count);
    }

    function decrement() public {
        require(count > 0, "Counter: count is zero");
        count--;
        emit Decremented(count);
    }
}