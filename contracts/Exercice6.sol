pragma solidity ^0.8.21;

contract Tableau {

    uint[] private nombres;

    event NombreAjoute(address indexed sender, uint256 nombre, uint256 longueur);

    constructor(uint[] memory initialNombres) {
        nombres = initialNombres;
    }

    function ajouterNombre(uint256 nombre) public {
        nombres.push(nombre);
        emit NombreAjoute(msg.sender, nombre, nombres.length);
    }

    function getElement(uint index) public view returns (uint) {
        require(index < nombres.length, "Index hors limites");
        return nombres[index];
    }

    function afficheTableau() public view returns (uint[] memory) {
        return nombres;
    }

    function calculerSomme() public view returns (uint) {
        uint somme = 0;
        for (uint i = 0; i < nombres.length; i++) {
            somme += nombres[i];
        }
        return somme;
    }

    
    
}
