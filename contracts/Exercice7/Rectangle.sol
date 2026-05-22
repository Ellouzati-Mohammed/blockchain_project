pragma solidity ^0.8.21;

import "./Form.sol";

contract Rectangle is Forme {

	uint public longueur;
	uint public largeur;

	constructor(uint _x, uint _y, uint _longueur, uint _largeur) Forme(_x, _y) {
		longueur = _longueur;
		largeur = _largeur;
	}

	function surface() public view override returns (uint) {
		return longueur * largeur;
	}

	function afficheInfos() public pure override returns (string memory) {
		return "Je suis Rectangle";
	}

	function afficheLoLa() public view returns (uint, uint) {
		return (longueur, largeur);
	}
}
