pragma solidity ^0.4.0;

contract Sample {
    
    /*storage*/
    uint public time_series_average_number;
    
    /*function setting number to user input*/
    function setTimeSeriesAverage(uint _number) public {
        time_series_average_number = _number;
    }
    
    /*getter for the number*/
    function getTimeSeriesAverage() public constant returns (uint) {
        return time_series_average_number;
    }
}
