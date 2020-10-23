const { HiveEngine } = require("@splinterlands/hive-interface")
const hive_engine = new HiveEngine();

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
       callback(tx)
     }
   });
 } catch (e) {
   setTimeout(() => {
     start()
   }, 3000)
 }
}

start()

module.exports.start = start
