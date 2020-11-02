require('dotenv').config();
const assert = require('assert');
const level = require("level")
const schedule = require('node-schedule')
const winston = require('winston');

const database = level("./database")

const isFirstSetup = require("./libs/setup/isFirstSetup.js")
const setupDatabase = require("./libs/setup/setupDatabase.js")

const hiveEngineDeposits = require("./libs/hive/scanHiveEngineTransactions.js");
const processHiveEngineDeposit = require("./libs/hive/processHiveEngineDeposit.js");

const scanEthereumTransactions = require("./libs/ethereum/scanEthereumTransactions.js")
const processEthereumTransaction = require("./libs/ethereum/processEthereumTransaction.js")
const sendEthereumTokens = require("./libs/ethereum/sendEthereumTokens.js")

const logger = winston.createLogger({
    level: 'error',
    transports: [
      new (winston.transports.File)({ filename: 'error.log' })
    ]
  })

const methods = ["mint", "transfer"]
assert(process.env.TOKEN_SYMBOL.length > 1, "TOKEN_SYMBOL length must be more than 1")
assert(process.env.HIVE_ACCOUNT.length > 1, "HIVE_ACCOUNT length must be more than 1")
assert(!process.env.HIVE_ACCOUNT.includes("@"), "HIVE_ACCOUNT should not include @")
assert(process.env.PERCENTAGE_DEPOSIT_FEE > 0, "PERCENTAGE_DEPOSIT_FEE must be more than 0")
assert(process.env.HIVE_TOKEN_PRECISION >= 0, "HIVE_TOKEN_PRECISION must be more or equal to 0")
assert(process.env.ETHEREUM_TOKEN_PRECISION > 0, "ETHEREUM_TOKEN_PRECISION must be more than 0")
assert(methods.includes(process.env.ETHEREUM_CONTRACT_FUNCTION), "ETHEREUM_CONTRACT_FUNCTION must be transfer or mint")

const alreadyProcessed = []

async function main(){
  console.log("-".repeat(process.stdout.columns))
  console.log(`Wrapped Hive Engine Orace\nCopyright: @fbslo, 2020\n`)
  console.log(`Token Symbol: ${process.env.TOKEN_SYMBOL}\nHive account: ${process.env.HIVE_ACCOUNT}\nEthereum contract: ${process.env.ETHEREUM_CONTRACT_ADDRESS}`)
  console.log("-".repeat(process.stdout.columns))

  hiveEngineDeposits.start((tx) => {
    processHiveEngineDeposit.start(tx)
      .then(async (result) => {
        if (result == 'deposit_refunded') console.log(`Invalid deposit transaction ${tx.transactionId} by ${tx.sender} refunded!`)
        else if (result == 'valid_deposit') {
          let payload = JSON.parse(tx.payload)
          sendEthereumTokens.start(payload.quantity, payload.memo, tx.sender, logger)
        }
      })
      .catch((err) => {
        console.log(`[!] Error while processing HE deposit:`, err)
        logger.log('error', `Error while processing HE deposit: ${err}`)
      })
  })

  //check for new deposits every minute
  schedule.scheduleJob('* * * * *', () => {
    scanEthereumTransactions.start(database, (tx) => {
      processEthereumTransaction.start(tx)
        .then((result) => {
          if (!alreadyProcessed.includes(result.hash)){
            alreadyProcessed.push(result.hash) //prevent double spend
            processHiveEngineDeposit.transfer(result.username, result.amount, result.hash)
          }
        })
        .catch((err) => {
          console.log(`[!] Error while processing Ethereum transaction:`, err)
          logger.log('error', `Error while processing Ethereum transaction: ${err}`)
        })
    })
  })
}

isFirstSetup.check(database)
  .then(async (result) => {
    if (result == true) {
      await setupDatabase.initialSetup(database)
      main()
    } else {
      main()
    }
  })
