pragma solidity ^0.8.21;

contract Exercice2{

   function etherEnWei(uint montantEther) public pure returns (uint) {
        return montantEther * 1 ether;
    }

    function weiEnEther(uint montantWei) public pure returns (uint) {
        return montantWei / 1 ether;
    }
}