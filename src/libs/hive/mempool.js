const hiveEngineDeposits = require("./libs/hive/scanHiveEngineTransactions.js");

function start(db, logger){
  //check mempool every minute, if secondary node is enabled
  schedule.scheduleJob('* * * * *', () => {
    hiveEngineDeposits.checkMempool(db, logger, (result) => {
      if (result.error != true && result.data != 'mempool_empty'){
        let txHash = result.data.transactionId.split("-")[0]
        if (!alreadyProcessed.includes(result.data.txHash)){
          alreadyProcessed.push(result.data.txHash) //prevent double spend
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


module.exports.start = start
