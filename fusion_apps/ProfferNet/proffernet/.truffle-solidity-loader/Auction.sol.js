var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Auction error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Auction error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Auction contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Auction: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Auction.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Auction not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "endBlock",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "withdraw",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "canceled",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "startBlock",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getHighestBid",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "cancelAuction",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "highestBidder",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "bidIncrement",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "ipfsHash",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "fundsByBidder",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "placeBid",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": true,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "highestBindingBid",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_owner",
            "type": "address"
          },
          {
            "name": "_bidIncrement",
            "type": "uint256"
          },
          {
            "name": "_startBlock",
            "type": "uint256"
          },
          {
            "name": "_endBlock",
            "type": "uint256"
          },
          {
            "name": "_ipfsHash",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "bidder",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "bid",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "highestBidder",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "highestBid",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "highestBindingBid",
            "type": "uint256"
          }
        ],
        "name": "LogBid",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "withdrawer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "withdrawalAccount",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "LogWithdrawal",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [],
        "name": "LogCanceled",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x60606040523461000057604051610957380380610957833981016040908152815160208301519183015160608401516080850151929491929091015b81831061004757610000565b4383101561005457610000565b600160a060020a038516151561006957610000565b60008054600160a060020a031916600160a060020a03871617815560018581556002858155600385905583516004805494819052937f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b602061010095831615959095026000190190911692909204601f90810184900483019391929186019083901061010057805160ff191683800117855561012d565b8280016001018555821561012d579182015b8281111561012d578251825591602001919060010190610112565b5b5061014e9291505b8082111561014a5760008155600101610136565b5090565b50505b50505050505b6107f1806101666000396000f300606060405236156100a95763ffffffff60e060020a600035041663083c632381146100ae5780633ccfd60b146100cd5780633f9942ff146100ee57806348cd4cb11461010f5780634979440a1461012e5780638da5cb5b1461014d5780638fa8b7901461017657806391f9015714610197578063b3cc167a146101c0578063c623674f146101df578063ce10cf801461026c578063ecfc7ecc14610297578063f5b56c56146102b3575b610000565b34610000576100bb6102d2565b60408051918252519081900360200190f35b34610000576100da6102d8565b604080519115158252519081900360200190f35b34610000576100da6104a6565b604080519115158252519081900360200190f35b34610000576100bb6104af565b60408051918252519081900360200190f35b34610000576100bb6104b5565b60408051918252519081900360200190f35b346100005761015a6104d4565b60408051600160a060020a039092168252519081900360200190f35b34610000576100da6104e3565b604080519115158252519081900360200190f35b346100005761015a61055e565b60408051600160a060020a039092168252519081900360200190f35b34610000576100bb61056d565b60408051918252519081900360200190f35b34610000576101ec610573565b604080516020808252835181830152835191928392908301918501908083838215610232575b80518252602083111561023257601f199092019160209182019101610212565b505050905090810190601f16801561025e5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34610000576100bb600160a060020a0360043516610601565b60408051918252519081900360200190f35b6100da610613565b604080519115158252519081900360200190f35b34610000576100bb6107a5565b60408051918252519081900360200190f35b60035481565b600060006000600354431080156102f2575060055460ff16155b156102fc57610000565b60055460ff161561032857505033600160a060020a0381166000908152600860205260409020546103fb565b60005433600160a060020a03908116911614156103655750506007546006546009805460ff19166001179055600160a060020a03909116906103fb565b60075433600160a060020a03908116911614156103de57600754600954600160a060020a03909116925060ff16156103b85750600754600160a060020a03166000908152600860205260409020546103d9565b50600654600754600160a060020a0316600090815260086020526040902054035b6103fb565b505033600160a060020a0381166000908152600860205260409020545b5b5b80151561040957610000565b600160a060020a038083166000908152600860205260408082208054859003905551339092169183156108fc0291849190818181858888f19350505050151561045157610000565b60408051600160a060020a0333811682528416602082015280820183905290517f0ec497a8ae5b1ba29c60470ef651def995fac3deebbdcc56c47a4e5f51a4c2bd9181900360600190a1600192505b5b505090565b60055460ff1681565b60025481565b600754600160a060020a03166000908152600860205260409020545b90565b600054600160a060020a031681565b6000805433600160a060020a039081169116146104ff57610000565b60035443111561050e57610000565b60055460ff161561051e57610000565b6005805460ff191660011790556040517f462b6ca7f632601af1295aeb320851f50e8e630a309173f23535845ea4bfb3b990600090a15060015b5b5b5b90565b600754600160a060020a031681565b60015481565b6004805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156105f95780601f106105ce576101008083540402835291602001916105f9565b820191906000526020600020905b8154815290600101906020018083116105dc57829003601f168201915b505050505081565b60086020526000908152604090205481565b60006000600060025443101561062857610000565b60035443111561063757610000565b60055460ff161561064757610000565b60005433600160a060020a039081169116141561066357610000565b34151561066f57610000565b33600160a060020a0316600090815260086020526040902054600654349091019250821161069c57610000565b50600754600160a060020a039081166000908152600860205260408082205433909316825290208290558082116106e3576106db6001548301826107ab565b600655610738565b60075433600160a060020a03908116911614610735576007805473ffffffffffffffffffffffffffffffffffffffff191633600160a060020a031617905560015461073190839083016107ab565b6006555b50805b60075460065460408051600160a060020a0333811682526020820187905290931683820152606083018490526080830191909152517ff152f4ff5e488c55370a2d53925a55055228ebd8ec95bd0251bbb299e48786b09181900360a00190a1600192505b5b5b5b5b505090565b60065481565b6000818310156107bc5750816107bf565b50805b929150505600a165627a7a72305820e00126da5c10d243ebf9c2cb084ed0c1359872e5a14725ff6ba271bdd31f39800029",
    "events": {
      "0xf152f4ff5e488c55370a2d53925a55055228ebd8ec95bd0251bbb299e48786b0": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "bidder",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "bid",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "highestBidder",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "highestBid",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "highestBindingBid",
            "type": "uint256"
          }
        ],
        "name": "LogBid",
        "type": "event"
      },
      "0x0ec497a8ae5b1ba29c60470ef651def995fac3deebbdcc56c47a4e5f51a4c2bd": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "withdrawer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "withdrawalAccount",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "LogWithdrawal",
        "type": "event"
      },
      "0x462b6ca7f632601af1295aeb320851f50e8e630a309173f23535845ea4bfb3b9": {
        "anonymous": false,
        "inputs": [],
        "name": "LogCanceled",
        "type": "event"
      }
    },
    "updated_at": 1599322861115
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Auction";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Auction = Contract;
  }
})();
