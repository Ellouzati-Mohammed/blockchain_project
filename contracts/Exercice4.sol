pragma solidity ^0.8.21;

contract Positif{

    function estPositif(int nombre) public pure returns (bool) {
        return nombre > 0;
    }
    
}