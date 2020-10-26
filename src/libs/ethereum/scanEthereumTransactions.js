const Web3 = require("web3")
const level = require("level")

const tokenABI = require("./tokenABI.js");
const web3 = new Web3(process.env.ETHEREUM_ENDPOINT);

const database = level("./database")

let processedTransactions = []

async function start(){
  getERC20TransactionsByEvent(process.env.ETHEREUM_CONTRACT_ADDRESS)
    .then(async (result) => {
      for (i in result){
        let data = await database.put(result[i].transactionHash, JSON.stringify({
          status: true,
          blockHash: result[i].blockHash,
          event: result[i].event,
          conversionInformation: {
            username: result[i].returnValues.username,
            amount: result[i].returnValues.amount / Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)
          }
        }))
        processedTransactions.push(result[i].transactionHash)
      }

      console.log(await JSON.stringify(database.get("0x31bdd95e38f23b6f9c2d2c3397e873e3c30c05cffbf32181e4ffb3b58ac5cb24")))

    })
    .catch((err) => {
      console.log(err)
    })
}

async function getERC20TransactionsByEvent(tokenContractAddress) {
  return new Promise(async (resolve, reject) => {
    await database.del("last_eth_block") //REMOVE LATER, ONLY DEV
    let currentBlockNumber = await web3.eth.getBlockNumber();
    let lastProcessedBlock;
    try {
      lastProcessedBlock = await database.get("last_eth_block")
    } catch (e) {
      if (e.name == 'NotFoundError') lastProcessedBlock = 500
    }
    let fromBlock = lastProcessedBlock - 500; //add some extra blocks so we don't miss any tx
    let toBlock = currentBlockNumber - 12 //wait 12 confirmations
    let contract = new web3.eth.Contract(tokenABI.ABI, tokenContractAddress);
    let pastEvents = await contract.getPastEvents("convertToken", {}, { fromBlock: fromBlock, toBlock: toBlock })
    await database.put("last_eth_block", toBlock - 50)
    resolve(pastEvents)
  })
}

module.exports.start = start
