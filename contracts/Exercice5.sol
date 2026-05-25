pragma solidity ^0.8.21;

contract Parite {

	function isEven(uint value) public pure returns (bool) {
		return value % 2 == 0;
	}
}
