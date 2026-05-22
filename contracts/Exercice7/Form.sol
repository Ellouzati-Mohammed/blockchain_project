pragma solidity ^0.8.21;

abstract contract Forme {

	uint public x;
	uint public y;

	constructor(uint _x, uint _y) {
		x = _x;
		y = _y;
	}

	function deplacerForme(uint dx, uint dy) public {
		x += dx;
		y += dy;
	}

	function afficheXY() public view returns (uint, uint) {
		return (x, y);
	}

	function afficheInfos() public pure virtual returns (string memory) {
		return "Je suis une forme";
	}

	function surface() public view virtual returns (uint);
}
