const Web3 = require("web3");
const utils = require('../../utils');

const tokenABI = require("./tokenABI.js");
const web3 = new Web3(process.env.ETHEREUM_ENDPOINT);

async function start(tx){
  return new Promise((resolve, reject)  => {
    if (tx.event === 'convertToken' && tx.removed === false){
      utils.log(`New ethereum transaction detected! Username: ${tx.returnValues.username}, amount: ${tx.returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)}, tx: [${tx.transactionHash}]`);
			
			let result = {
        username: tx.returnValues.username,
        amount: tx.returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION),
        hash: tx.transactionHash
			}
			
      resolve(result)
    }
  })
}

module.exports.start = start
