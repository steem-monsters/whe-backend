const Web3 = require("web3")

const tokenABI = require("./tokenABI.js");
const web3 = new Web3(process.env.ETHEREUM_ENDPOINT);

async function start(tx){
  return new Promise((resolve, reject)  => {
    if (tx.event === 'convertToken' && tx.removed === false){
      if (process.env.LEO_BRIDGE_ENABLED == 'true' && tx.returnValues.username.includes('leobridge:')){
        console.log(`New LEO Bridge transaction detected! ID: ${tx.returnValues.username.split(":")[1]}, amount: ${tx.returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)}`)
        let result = {
          username: tx.returnValues.username,
          amount: tx.returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION),
          hash: tx.transactionHash,
          isLeoBridge: true
        }
        resolve(result)
      } else {
        console.log(`New ethereum transaction detected! Username: ${tx.returnValues.username}, amount: ${tx.returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)}`)
        let result = {
          username: tx.returnValues.username,
          amount: tx.returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION),
          hash: tx.transactionHash
        }
        resolve(result)
      }
    }
  })
}

module.exports.start = start
