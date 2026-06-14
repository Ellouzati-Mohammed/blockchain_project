// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Payment {

    address public recipient;

    event PaymentReceived(address indexed sender, uint256 amount);
    event Withdrawal(address indexed recipient, uint256 amount);

    constructor(address _recipient) {
        recipient = _recipient;
    }

    function receivePayment() public payable {
        require(msg.value > 0, "La valeur envoyee doit etre > 0");
        emit PaymentReceived(msg.sender, msg.value);
    }

    function withdraw() public {
        require(msg.sender == recipient, "Acces refuse");
        uint256 amount = address(this).balance;
        payable(recipient).transfer(amount);
        emit Withdrawal(recipient, amount);
    }


}
