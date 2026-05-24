// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Payment {

    address public recipient;

    constructor(address _recipient) {
        recipient = _recipient;
    }

    function receivePayment() public payable {
        require(msg.value > 0, "La valeur envoyee doit etre > 0");
    }

    function withdraw() public {
        require(msg.sender == recipient, "Acces refuse");
        payable(recipient).transfer(address(this).balance);
    }


}
