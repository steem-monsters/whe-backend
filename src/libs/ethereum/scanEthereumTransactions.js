const Web3 = require("web3")

const tokenABI = require("./tokenABI.js");
const web3 = new Web3(process.env.ETHEREUM_ENDPOINT);

let processedTransactions = []
let notProcessedYet = []

async function start(database, callback){
  getERC20TransactionsByEvent(database, process.env.ETHEREUM_CONTRACT_ADDRESS)
    .then(async (result) => {
      for (i in result){
        let isInTheDatabase = await isAlreadyInTheDatabase(result[i].transactionHash)
        if (!processedTransactions.includes(result[i].transactionHash) || !isInTheDatabase){
          callback(result[i]) //return new transaction
          processedTransactions.push(result[i].transactionHash)
          let json = JSON.stringify({
            status: true,
            blockHash: result[i].blockHash,
            event: result[i].event,
            conversionInformation: {
              username: result[i].returnValues.username,
              amount: result[i].returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)
            }
          })
          await database.put(result[i].transactionHash, json)
        }
      }
      updateListOfTransactions(database, result)
    })
    .catch((err) => {
      console.log(err)
    })
}

async function getERC20TransactionsByEvent(database, tokenContractAddress) {
  return new Promise(async (resolve, reject) => {
    let currentBlockNumber = await web3.eth.getBlockNumber();
    let lastProcessedBlock = await database.get("last_eth_block")
    let fromBlock = lastProcessedBlock - 500; //add some extra blocks so we don't miss any tx
    let toBlock = currentBlockNumber - 12 //wait 12 confirmations
    let contract = new web3.eth.Contract(tokenABI.ABI, tokenContractAddress);
    let pastEvents = await contract.getPastEvents("convertToken", {}, { fromBlock: fromBlock, toBlock: toBlock })
    await database.put("last_eth_block", toBlock - 50)
    resolve(pastEvents)
  })
}

async function updateListOfTransactions(database, result){
  //store new tx's to list {transactionHash: true...}
  let allEthereumTransactons = await database.get("all_ethereum_transactions")
  let allEthereumTransactonsJson = JSON.parse(allEthereumTransactons)
  for (i in result){
    allEthereumTransactonsJson[result[i].transactionHash] = true
  }
  await database.put("all_ethereum_transactions", JSON.stringify(allEthereumTransactonsJson))
}

async function isAlreadyInTheDatabase(hash){
  try {
    await database.get(result[i].transactionHash)
    return true;
  } catch (e){
    if (e.name == 'NotFoundError') return false;
  }
}

module.exports.start = start
