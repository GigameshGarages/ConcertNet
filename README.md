ETHIndia2020DAppJedi
Submission for ETH India 2020 DApp Jedi Hackathon

## Overview

This is a reference implementation of the FusionLedger framework for On-chain and Off-chain interaction between real work data and digital world institutions. FusionOracles will represent the real world data and FractalDAOs represent the digital world institutions like Banks, Treasuries, Markets, etc. 

## Components
* Fusion Oracles
* Fractal DAOs
* Fusion Forward Manager
* Verifiable Delay Functions
* Auction Apps

## Dependencies
* Node.js
* Truffle.js
* React.js
* Web3.js
* NPM
* node-fetch

## Fusion Scrpts
Fusion Scripts consists of 2 core functions:

### main: 
This function fetches data from the time series api, which in this example is the source of transportation time seres data on the Government Data web portal. This is then set as the input for the setNumber function in the deployed sample smart contract. This input is set as the object for the second function (sendTx).

### sendTx: 
This function sets all the parameters for the transaction, signs the transaction and sends the transaction.

## Implementation

* Clone the repository.
* Set up an ethereum wallet with Matic Network (metamask is easiest).
* Deploy "sample.sol" (remix is easiest).
