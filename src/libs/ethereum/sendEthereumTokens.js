const Web3 = require("web3");
const Tx = require('ethereumjs-tx').Transaction;
const axios = require("axios");

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETHEREUM_ENDPOINT));
const tokenABI = require("./tokenABI.js");
const hiveEngineTokenPrice = require("../market/hiveEngineTokenPrice.js")

function start(depositAmount, address){
  return new Promise(async (resolve, reject) => {
    try {
      let gasPrice = await getRecomendedGasPrice()
      let amount = depositAmount * Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION); //remove decimal places => 0.001, 3 decimal places => 0.001 * 1000 = 1
      amount = parseFloat(amount - (amount * (process.env.PERCENTAGE_DEPOSIT_FEE / 100))).toFixed(0); //remove % fee
      let contract = new web3.eth.Contract(tokenABI.ABI, process.env.ETHEREUM_CONTRACT_ADDRESS);
      let nonce = await web3.eth.getTransactionCount(process.env.ETHEREUM_ADDRESS, 'pending');
      let hiveEngineTokenPriceInEther = await hiveEngineTokenPrice.start(); //get HE token price in ETH
      let estimatedGasFee = await caculateTransactionFee(contract, address, amount, gasPrice); //get estimated ETH used
      let estimatedTransactionFeeInHETokens = parseFloat(estimatedGasFee / hiveEngineTokenPriceInEther).toFixed(0)
      amount = amount - estimatedTransactionFeeInHETokens
      let contractFunction = contract.methods[process.env.ETHEREUM_CONTRACT_FUNCTION](address, amount).encodeABI(); //either mint() or transfer() tokens
      let rawTransaction = {
        "from": process.env.ETHEREUM_ADDRESS,
        "nonce": "0x" + nonce.toString(16),
        "gasPrice": web3.utils.toHex(gasPriceGwei * 1e9),
        "gasLimit": web3.utils.toHex(process.env.ETHEREUM_GAS_LIMIT),
        "to": address,
        "data": contractFunction,
        "chainId": process.env.ETHEREUM_CHAIN_ID
      };
      let tx = new Tx(rawTransaction, { chain: process.env.ETHEREUM_CHAIN_IDn });
      tx.sign(new Buffer.from(process.env.ETHEREUM_PRIVATE_KEY, 'hex'));
      let serializedTx = tx.serialize();
      let receipt = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
      let hash = receipt.transactionHash

    } catch(e){
      console.log(e)
      reject(e)
    }
  })
}

function getRecomendedGasPrice(){
  return new Promise((resolve, reject) => {
    axios
      .get(`https://ethgasstation.info/api/ethgasAPI.json?api-key=${process.env.ETH_GAS_STATON_API_KEY}`)
      .then(response => {
        let speed = process.env.ETH_FEE_SPEED
        if (response.data[speed]) resolve(response.data[speed] / 10)
        else reject("data_incorrect")
      })
      .catch(err => {
        reject(err)
      });
  })
}

function caculateTransactionFee(contract, address, amount, gasPrice){
  return new Promise((resolve, reject) => {
    let contractFunction = contract.methods[process.env.ETHEREUM_CONTRACT_FUNCTION](address, amount);
    let estimatedGas = await contractFunction.estimateGas({ from: process.env.ETHEREUM_ADDRESS });
    let wei = estimatedGas * gasPrice * 1000000000
    let etherValue = Web3.utils.fromWei(wei.toString(), 'ether');
    resolve(etherValue)
  })
}

module.exports.start = start
