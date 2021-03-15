const Web3 = require("web3");
const Tx = require('ethereumjs-tx').Transaction;
const axios = require("axios");
const { Hive } = require("@splinterlands/hive-interface")

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETHEREUM_ENDPOINT));
const hive = new Hive({rpc_error_limit: 5}, {rpc_nodes: process.env.HIVE_RPC_NODES.split(',')});

const tokenABI = require("./tokenABI.js");
const hiveEngineTokenPrice = require("../market/hiveEngineTokenPrice.js")

async function start(depositAmount, address, sender, logger){
  try {
    let gasPrice = await getRecomendedGasPrice()
    let amount = depositAmount * Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION); //remove decimal places => 0.001, 3 decimal places => 0.001 * 1000 = 1
    amount = parseFloat(amount - (amount * (process.env.PERCENTAGE_DEPOSIT_FEE / 100))).toFixed(0); //remove % fee
    let contract = new web3.eth.Contract(tokenABI.ABI, process.env.ETHEREUM_CONTRACT_ADDRESS);
    let nonce = await web3.eth.getTransactionCount(process.env.ETHEREUM_ADDRESS, 'pending');
    // let hiveEngineTokenPriceInEther = await hiveEngineTokenPrice.start(); //get HE token price in ETH
    // let estimatedGasFee = await caculateTransactionFee(contract, address, amount, gasPrice); //get estimated ETH used
    // let estimatedTransactionFeeInHETokens = parseFloat(estimatedGasFee.etherValue / hiveEngineTokenPriceInEther * Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)).toFixed(0)
    amount = parseFloat(amount).toFixed(0)
    if (amount <= 0){ //if amount is less than 1, refund
      //refundFailedTransaction(depositAmount, sender, 'Amount after fees is less or equal to 0')
    } else {
      let contractFunction = contract.methods[process.env.ETHEREUM_CONTRACT_FUNCTION](address, amount).encodeABI(); //either mint() or transfer() tokens
      let rawTransaction = {
        "from": process.env.ETHEREUM_ADDRESS,
        "nonce": "0x" + nonce.toString(16),
        "gasPrice": web3.utils.toHex(gasPrice * 1e9),
        "gasLimit": web3.utils.toHex(process.env.ETHEREUM_GAS_LIMIT),
        "to": process.env.ETHEREUM_CONTRACT_ADDRESS,
        "data": contractFunction,
        "chainId": process.env.ETHEREUM_CHAIN_ID
      };
      // let tx = new Tx(rawTransaction, { chain: process.env.ETHEREUM_CHAIN });
      // tx.sign(new Buffer.from(process.env.ETHEREUM_PRIVATE_KEY, 'hex'));
      let createTransaction = await web3.eth.accounts.signTransaction(rawTransaction, process.env.ETHEREUM_PRIVATE_KEY)
      // let serializedTx = tx.serialize();
      let receipt = await web3.eth.sendSignedTransaction(createTransaction.rawTransaction);
      let { transactionHash, gasUsed, status } = receipt
      //sendDepositConfirmation(transactionHash, sender)
      // if (gasUsed < estimatedGasFee.estimatedGas){ //refund any extra fees
      //   let spendTransactionFeeInHETokens = parseFloat(gasUsed / hiveEngineTokenPriceInEther).toFixed(process.env.HIVE_TOKEN_PRECISION)
      //   let extraFeeRefund = (estimatedTransactionFeeInHETokens / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)) - spendTransactionFeeInHETokens
      //   sendFeeRefund(parseFloat(extraFeeRefund).toFixed(process.env.HIVE_TOKEN_PRECISION), sender)
			// }
			
			return receipt;
    }
  } catch(e){
    let details  = {
      depositAmount: depositAmount,
      address: address,
      sender: sender,
      time: new Date()
    }
    if ((e).toString().includes("Transaction was not mined within 750 seconds")){
      console.log(`Error (not minted within 750 seconds) NOT refunded: ${e}, details: ${JSON.stringify(details)}`)
      logger.log('error', `Error (not minted within 750 seconds) NOT refunded: ${e}, details: ${JSON.stringify(details)}`)
    } else {
      console.log(`Error while sending ERC-20 token, refunded: ${e}, details: ${JSON.stringify(details)}`)
      logger.log('error', `Error while sending ERC-20 token, refunded: ${e}, details: ${JSON.stringify(details)}`)
      //refundFailedTransaction(depositAmount, sender, 'Internal server error while processing your request')
    }
  }
}

async function sendFeeRefund(amount, sender){
  let json = {
    contractName: "tokens", contractAction: "transfer", contractPayload: {
      symbol: process.env.TOKEN_SYMBOL,
      to: sender,
      quantity: amount.toString(),
      memo: `Refund of over-estimated transaction fees: ${amount} ${process.env.TOKEN_SYMBOL}`
    }
  }
  let transaction = await hive.custom_json('ssc-mainnet-hive', json, process.env.HIVE_ACCOUNT, process.env.HIVE_ACCOUNT_PRIVATE_KEY, true);
}

async function sendDepositConfirmation(transactionHash, sender){
  let json = {
    contractName: "tokens", contractAction: "transfer", contractPayload: {
      symbol: process.env.TOKEN_SYMBOL,
      to: sender,
      quantity: Math.pow(10, -(process.env.HIVE_TOKEN_PRECISION)).toString(),
      memo: `Wrapped ${process.env.TOKEN_SYMBOL} tokens sent! Transaction Hash: ${transactionHash}`
    }
  }
  let transaction = await hive.custom_json('ssc-mainnet-hive', json, process.env.HIVE_ACCOUNT, process.env.HIVE_ACCOUNT_PRIVATE_KEY, true);
}

async function refundFailedTransaction(depositAmount, sender, message){
  let json = {
    contractName: "tokens", contractAction: "transfer", contractPayload: {
      symbol: process.env.TOKEN_SYMBOL,
      to: sender,
      // quantity: depositAmount.toString(),
      quantity: Math.pow(10, -(process.env.HIVE_TOKEN_PRECISION)).toString(),
      memo: `Something went wrong while processing your transaction, but it's possible you will still receive your tokens. If you don't receive them, please contact support.`
    }
  }
  let transaction = await hive.custom_json('ssc-mainnet-hive', json, process.env.HIVE_ACCOUNT, process.env.HIVE_ACCOUNT_PRIVATE_KEY, true);
}

function getRecomendedGasPrice(){
  // return new Promise((resolve, reject) => {
  //   axios
  //     .get(`https://ethgasstation.info/api/ethgasAPI.json?api-key=${process.env.ETH_GAS_STATON_API_KEY}`)
  //     .then(response => {
  //       let speed = process.env.ETH_FEE_SPEED
  //       if (response.data[speed]) resolve(response.data[speed] / 10)
  //       else reject("data_incorrect")
  //     })
  //     .catch(err => {
  //       reject(err)
  //     });
  // })
  return 15;
}

async function caculateTransactionFee(contract, address, amount, gasPrice){
  return new Promise(async (resolve, reject) => {
    let contractFunction = contract.methods[process.env.ETHEREUM_CONTRACT_FUNCTION](address, amount);
    let estimatedGas = await contractFunction.estimateGas({ from: process.env.ETHEREUM_ADDRESS });
    let wei = parseFloat(estimatedGas * gasPrice * 1000000000).toFixed(0)
    let etherValue = Web3.utils.fromWei(wei.toString(), 'ether');
    resolve({
      etherValue: etherValue,
      estimatedGas: estimatedGas
    })
  })
}

module.exports.start = start
