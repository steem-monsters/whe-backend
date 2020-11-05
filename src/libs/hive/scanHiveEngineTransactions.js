const { HiveEngine } = require("@splinterlands/hive-interface")
const hive_engine = new HiveEngine();

const axios = require('axios');
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const adapter = new FileAsync('./database/database.json')

let alreadyProcessed = []

function start(callback){
  try {
   hive_engine.stream((tx) => {
     let { transactionId, sender, contract, action, payload, logs } = tx
     payload = JSON.parse(payload)
     if (contract == "tokens" &&
         action == "transfer" &&
         payload.symbol == process.env.TOKEN_SYMBOL &&
         payload.to == process.env.HIVE_ACCOUNT
     ){
       let txHash = tx.transactionId.split("-")[0]
       if (!alreadyProcessed.includes(txHash)){
         alreadyProcessed.push(txHash)
         if (process.env.VERIFY_SECONDARY_NODE == 'true'){
           let isTransactionValid = getSecondaryNodeInformation(transactionId, tx)
           if (isTransactionValid == 'transaction_valid') callback(tx)
         } else {
           callback(tx)
         }
       }
     }
   });
 } catch (e) {
   setTimeout(() => {
     start()
   }, 3000)
 }
}

function getSecondaryNodeInformation(transactionId, tx){
  return new Promise(async (resolve, reject) => {
    axios.post(process.env.HIVE_ENGINE_SECONDARY_ENDPOINT, {
      "jsonrpc": "2.0",
      "method": "getTransactionInfo",
      "params": {
        "txid": transactionId
      },
      "id": 1
    })
    .then(function (response) {
      if (response == null || response.data == null || response.data.result == null) {
        //add transaction to mempool
        let isAlreadyInMemPool = db.get("mempool").find({ id: transactionId }).value()
        if (isAlreadyInMemPool.length == 0){
          db.get('mempool')
            .push({ id: transactionId, tx: tx })
            .write()
          resolve("added_to_mempool")
        } else {
          resolve("already_in_mempool")
        }
      }
      else if (!response.data.result.logs.includes("errors")){
        resolve("transaction_valid")
      } else {
        reject("transaction_rejected")
      }
    })
    .catch(function (error) {
      reject(err)
    });
  })
}

async function checkMempool(callback, db){
  try {
    let mempool = db.get("mempool").value()
    if (mempool.length == 0) callback({ error: false, data: "mempool_empty" })
    for (i in mempool){
      let isValid = await getSecondaryNodeInformation(mempool[i].id)
      if (isValid == "transaction_valid"){
        db.get('mempool') //remove tx from mempool
          .remove({ id: mempool[i].id })
          .write()

        callback({
          error: false,
          data: mempool[i]
        })
      }
      await sleep(5000) //prevent overloading eth transaactions and possible nonce complications
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
module.exports.checkMempool = checkMempool
