// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Exercie1 {
    uint private a;
    uint private b;


    function addition1() public view returns (uint) {
        return a + b;
    }

    function addition2(uint x, uint y) public pure returns (uint) {
        return x + y;
    }
}
