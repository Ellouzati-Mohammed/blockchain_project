pragma solidity ^0.8.21;

contract GestionChaines {
    string private message;

    function setMessage(string _message) public {
        message = _message;
    }
    function getMessage() public view returns(string){
        return message;
    }

    function concatener(string msg1,string msg2) public pure returns(string){
        return  string.concat(msg1, msg2);
    }

    function concatenerAvec(string  _message) public view returns (string ) {
        return string.concat(message, _message);
    }

    function longueur(string  _message) public pure returns (uint) {
        return bytes(_message).length;
    }

    function comparer(string msg1, string msg2) public pure returns (bool) {
        return keccak256(bytes(msg1)) == keccak256(bytes(msg2));
    }
}