require('dotenv')
const database = require("./mongoDatabase.js");

const hiveEngineDeposits = require("./libs/hive/scanHiveEngineTransactions.js");
const processHiveEngineDeposit = require("./libs/hive/processHiveEngineDeposit.js");
const sendEthereumTokens = require("./libs/ethereum/sendEthereumTokens.js")

database.connect()
  .then(res => main())
  .catch((err) => {
    console.log(err);
    process.exit(1);
  })

function main(){
  // TODO: verify config is correct
  console.log(`Starting the Oracle node!\nToken Symbol: ${process.env.TOKEN_SYMBOL}\nHive account: ${process.env.HIVE_ACCOUNT}`)
  hiveEngineDeposits.start((tx) => {
    processHiveEngineDeposit.start(tx)
      .then(async (result) => {
        if (result == 'deposit_refunded') console.log(`Invalid deposit transaction ${tx.transactionId} by ${tx.sender} refunded!`)
        if (result == 'valid_deposit') {
          let payload = JSON.parse(tx.payload)
          sendEthereumTokens.start(payload.quantity, payload.memo, tx.sender)
        }
      })
      .catch(err => console.log(err))
  })
}
