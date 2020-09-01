pragma solidity ^0.4.0;

contract Sample {
    
    /*storage*/
    uint public invoice_index_number;
    
    /*function setting number to user input*/
    function setNumber(uint _number) public {
        invoice_index_number = _number;
    }
    
    /*getter for the number*/
    function getNumber() public constant returns (uint) {
        return invoice_index_number;
    }
}
