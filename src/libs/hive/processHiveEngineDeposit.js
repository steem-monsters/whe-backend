const Web3 = require("web3")
const Tx = require('ethereumjs-tx').Transaction;
const { Hive } = require("@splinterlands/hive-interface")

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETHEREUM_ENDPOINT));
const hive = new Hive({rpc_error_limit: 5}, {rpc_nodes: process.env.HIVE_RPC_NODES.split(',')});

const isAlreadyProcessed = []

function start(tx){
  return new Promise(async (resolve, reject) => {
    try {
      let { transactionId, sender, contract, action, payload, logs } = tx
      payload = JSON.parse(payload)
      if (payload.quantity >= process.env.MIN_AMOUNT &&
          payload.quantity <= process.env.MAX_AMOUNT &&
          web3.utils.isAddress(payload.memo) &&
          !isAlreadyProcessed.includes(transactionId)
      ){
        resolve(`valid_deposit`)
      } else {
        let json = {
          contractName: "tokens", contractAction: "transfer", contractPayload: {
            symbol: process.env.TOKEN_SYMBOL,
            to: sender,
            quantity: payload.quantity,
            memo: `Refund! Are you sure the amount is between ${process.env.MIN_AMOUNT} and ${process.env.MAX_AMOUNT} and memo is valid Ethereum address?`
          }
        }
        let transaction = await hive.customJson('ssc-mainnet-hive', json, process.env.HIVE_ACCOUNT, process.env.HIVE_ACCOUNT_PRIVATE_KEY);
        resolve(`deposit_refunded`)
      }
    } catch (e){
      console.log(e)
      reject(e)
    }
  })
}

module.exports.start = start
