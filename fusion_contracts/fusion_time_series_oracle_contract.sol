pragma solidity ^0.6.0;

contract TimeSeriesOracle {
    
    /*Time Series Average Index*/
    uint public time_series_average_number;
    
    /*function setting Time Series Avarge from the Data Source*/
    function setTimeSeriesAverage(uint _number) public {
        time_series_average_number = block.timestamp + _number;
    }
    
    /*getter for the Time Sries Average Index*/
    function getTimeSeriesAverage() public view returns (uint) {
        return time_series_average_number;
    }
}
