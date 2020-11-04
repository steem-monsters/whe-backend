const { HiveEngine } = require("@splinterlands/hive-interface")
const hive_engine = new HiveEngine();

const axios = require('axios');
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const adapter = new FileAsync('./mempool.json')

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
        low(adapter)
          .then(db => {
            db.defaults({ transactions: [] }).write()

            let isAlreadyInMemPool = db.get("transactions").find({ id: transactionId }).value()
            if (isAlreadyInMemPool.length == 0){
              db.get('transactions')
                .push({ id: transactionId, tx: tx })
                .write()
              resolve("added_to_mempool")
            } else {
              resolve("already_in_mempool")
            }
          })
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

async function checkMempool(callback){
  low(adapter)
    .then(async db => {
      try {
        db.defaults({ transactions: [] }).write()
        let mempool = db.get("transactions").value()
        if (mempool.length == 0) callback({ error: false, data: "mempool_empty" })
        for (i in mempool){
          let isValid = await getSecondaryNodeInformation(mempool[i].id)
          if (isValid == "transaction_valid"){
            callback({
              error: false,
              data: mempool[i]
            })
          }
        }
      } catch (e) {
        callback({
          error: true,
          data: e
        })
      }
    })
}

module.exports.start = start
module.exports.checkMempool = checkMempool
