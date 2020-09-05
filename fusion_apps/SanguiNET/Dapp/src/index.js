import React from 'react'
import ReactDOM from 'react-dom'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App'
import * as serviceWorker from './serviceWorker';
import Web3 from 'web3'

import './index.css'

import truffleConfig from '../truffle.js'

var web3Location = `http://${truffleConfig.rpc.host}:${truffleConfig.rpc.port}`

window.addEventListener('load', function() {                    
  var web3Provided;
  // Supports Metamask and Mist, and other wallets that provide 'web3'.      
  if (typeof web3 !== 'undefined') {                            
    // Use the Mist/wallet provider.     
    // eslint-disable-next-line                       
    web3Provided = new Web3(web3.currentProvider);               
  } else {                                                      
    web3Provided = new Web3(new Web3.providers.HttpProvider(web3Location))
  }   
  
  ReactDOM.render(
    <App web3={web3Provided} />,
    document.getElementById('root')
  )                                                                                                                    
});

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

