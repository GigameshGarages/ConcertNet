pragma solidity ^0.4.0;

contract Sample {
    
    /*storage*/
    uint public number;
    
    /*function setting number to user input*/
    function setNumber(uint _number) public {
        number = _number;
    }
    
    /*getter for the number*/
    function getNumber() public constant returns (uint) {
        return number;
    }
}
