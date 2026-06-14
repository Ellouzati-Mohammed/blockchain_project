pragma solidity ^0.8.21;

contract GestionChaines {
    string private message;

    event MessageUpdated(address indexed sender, string message);

    function setMessage(string memory _message) public {
        message = _message;
        emit MessageUpdated(msg.sender, _message);
    }
    function getMessage() public view returns(string memory){
        return message;
    }

    function concatener(string memory msg1, string memory msg2) public pure returns(string memory){
        return  string.concat(msg1, msg2);
    }

    function concatenerAvec(string memory _message) public view returns (string memory) {
        return string.concat(message, _message);
    }

    function longueur(string memory _message) public pure returns (uint) {
        return bytes(_message).length;
    }

    function comparer(string memory msg1, string memory msg2) public pure returns (bool) {
        return keccak256(bytes(msg1)) == keccak256(bytes(msg2));
    }
}