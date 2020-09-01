var sampleContract = web3.eth.contract([{"constant":true,"inputs":[],"name":"getTimeSeriesAverage","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_number","type":"uint256"}],"name":"setTimeSeriesAverage","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"time_series_average_number","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]);
var sample = sampleContract.new(
   {
     from: web3.eth.accounts[0], 
     data: '0x608060405234801561001057600080fd5b50610117806100206000396000f3006080604052600436106053576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063b7c3a11a146058578063d41f256d146080578063f51123a61460aa575b600080fd5b348015606357600080fd5b50606a60d2565b6040518082815260200191505060405180910390f35b348015608b57600080fd5b5060a86004803603810190808035906020019092919050505060db565b005b34801560b557600080fd5b5060bc60e5565b6040518082815260200191505060405180910390f35b60008054905090565b8060008190555050565b600054815600a165627a7a72305820329809895442e5be12eb14cdf0184ea7f2ce0bf95577de5533ec89f04339330d0029', 
     gas: '4700000'
   }, function (e, contract){
    console.log(e, contract);
    if (typeof contract.address !== 'undefined') {
         console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
    }
 })
