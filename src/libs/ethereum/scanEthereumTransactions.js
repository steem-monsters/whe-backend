const Web3 = require("web3")

const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const adapter = new FileAsync('./ethereumTransactions.json')

const tokenABI = require("./tokenABI.js");
const web3 = new Web3(process.env.ETHEREUM_ENDPOINT);

let processedTransactions = []

async function start(callback){
  getERC20TransactionsByEvent(process.env.ETHEREUM_CONTRACT_ADDRESS)
    .then(async (result) => {
      for (i in result){
        let isInTheDatabase = await isAlreadyInTheDatabase(result[i].transactionHash)
        if (!processedTransactions.includes(result[i].transactionHash) && !isInTheDatabase){
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
          low(adapter).then(db => { db.defaults({ transactions: [], block: 0 }).write(); db.get("transactions").push({ id: result[i].transactionHash }) })
          callback(result[i]) //return new transaction
        }
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

async function getERC20TransactionsByEvent(database, tokenContractAddress) {
  return new Promise(async (resolve, reject) => {
    let currentBlockNumber = await web3.eth.getBlockNumber();
    let lastProcessedBlock = await getLastProcesedBlock()
    let fromBlock = lastProcessedBlock - 500; //add some extra blocks so we don't miss any tx
    let toBlock = currentBlockNumber - 12 //wait 12 confirmations
    let contract = new web3.eth.Contract(tokenABI.ABI, tokenContractAddress);
    let pastEvents = await contract.getPastEvents("convertToken", {}, { fromBlock: fromBlock, toBlock: toBlock })
    db.update('block', toBlock).write()
    resolve(pastEvents)
  })
}

async function isAlreadyInTheDatabase(hash){
  return new Promise(async (resolve, reject) => {
    low(adapter).then(db => {
      db.defaults({ transactions: [] }).write();
      let transaction = db.get("transactions")
      .find({ id: hash })
      .value()
      if (tranaction == undefined) resolve(false)
      else resolve (true)
    })
  })
}

function getLastProcesedBlock(){
  return new Promise(async (resolve, reject) => {
    low(adapter).then(db => {
      db.defaults({ transactions: [], block: 0 }).write();
      let transaction = db.get("block").value()
      resolve(transaction)
    })
  })
}

module.exports.start = start
