# ETHIndia2020DAppJedi
Submission for ETH India 2020 DApp Jedi Hackathon

## Overview

This is an implementation of an Ethereum oracle using web3. An oracle is simply a messenger which relays data from one source to another, in this case a number is fetched from an API and this is relayed to a smart contract on the ethereum blockchain via the "setNumber" function in the sample smart contract.

## Dependencies
* Node.js
* NPM
* Web3
* node-fetch

## Fusion Scrpts

Fusion Scripts consists of 2 core functions:

### main: 
This function fetches data from the time series api, which in this example is the source of transportation time seres data on the Government Data web portal. This is then set as the input for the setNumber function in the deployed sample smart contract. This input is set as the object for the second function (sendTx).

### sendTx: 
This function sets all the parameters for the transaction, signs the transaction and sends the transaction.



## Implementation

* Clone the repository.
* Set up an ethereum wallet with ropsten ether (metamask is easiest).
* Deploy "sample.sol" (remix is easiest).
* Obtain a provider for the Ethereum network, you can run your own node via mist however for simplicity we are using Infura which is a public gateway to the blockchain. Sign up and you will be provided with an API key.
* Edit oracle.js as directed by the comments in the script. You will need: your infura API key, your ethereum wallet's private key, the smart contract's ABI (sample.sol ABI has been provided), and the address of the deployed contract.
* Run the oracle: cd into the directory and run command "node oracle.js".
