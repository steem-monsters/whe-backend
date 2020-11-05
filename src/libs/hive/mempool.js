const sendEthereumTokens = require("../ethereum/sendEthereumTokens.js")
const hiveEngine = require("./libs/hive/scanHiveEngineTransactions.js");

const mongo = require("../../mongo.js")
const database = mongo.get().db("oracle")

let alreadyProcessed = []

function start(logger){
  //check mempool every minute, if secondary node is enabled
  schedule.scheduleJob('* * * * *', () => {
    checkMempool((result) => {
      if (result.error != true && result.data != 'mempool_empty'){
        let txHash = result.data.transactionId.split("-")[0]
        if (!alreadyProcessed.includes(result.data.txHash)){
          alreadyProcessed.push(result.data.txHash)
          let payload = JSON.parse(result.data.payload)
          sendEthereumTokens.start(payload.quantity, payload.memo, tx.sender, logger)
        }
      } else if (result.error == true){
        console.log(`[!] Error while processing hive mempool:`, result.data)
        logger.log('error', `Error while processing hive mempool: ${result.data}`)
      }
    })
  })
}

async function checkMempool(callback){
  try {
    let mempool = await database.collection("mempool").find({})
    if (mempool.length == 0) callback({ error: false, data: "mempool_empty" })
    for (i in mempool){
      let isValid = await hiveEngine.getSecondaryNodeInformation(mempool[i].transactionId)
      if (isValid == "transaction_valid"){
        await databse.collection("mempool").remove({ transactionId: mempool[i].transactionId })
        callback({
          error: false,
          data: mempool[i]
        })
      }
      await sleep(5000) //prevent overloading eth transactions and possible nonce complications
    }
  } catch (e) {
    callback({
      error: true,
      data: e
    })
  }
}

function sleep(ms){
  return new Promise((resolve, reject) => {
    setTimeout(() => { resolve() }, ms)
  })
}


module.exports.start = start
