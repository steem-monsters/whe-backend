require('dotenv').config();
const utils = require('./utils');
const assert = require('assert');
const schedule = require('node-schedule')
const winston = require('winston');
const bridge = require('@splinterlands/external-bridge');
const { Hive } = require("@splinterlands/hive-interface");
const sendEthereumTokens = require("./libs/ethereum/sendEthereumTokens.js");
const hive = new Hive({ rpc_error_limit: 5 }, { rpc_nodes: process.env.HIVE_RPC_NODES.split(',') });

const database = require("./mongo.js")

const logger = winston.createLogger({
    level: 'error',
    transports: [
      new (winston.transports.File)({ filename: 'error.log' })
    ]
  })

const methods = ["mint", "transfer"];
assert(process.env.TOKEN_SYMBOL.length > 1, "TOKEN_SYMBOL length must be more than 1");
assert(process.env.HIVE_ACCOUNT.length > 1, "HIVE_ACCOUNT length must be more than 1");
assert(process.env.GAME_API_URL.length > 1, "GAME_API_URL length must be more than 1");
assert(process.env.TX_PREFIX.length > 1, "TX_PREFIX length must be more than 1");
assert(!process.env.HIVE_ACCOUNT.includes("@"), "HIVE_ACCOUNT should not include @");
assert(process.env.PERCENTAGE_DEPOSIT_FEE >= 0, "PERCENTAGE_DEPOSIT_FEE must be more or equal to 0");
assert(process.env.HIVE_TOKEN_PRECISION >= 0, "HIVE_TOKEN_PRECISION must be more or equal to 0");
assert(process.env.ETHEREUM_TOKEN_PRECISION >= 0, "ETHEREUM_TOKEN_PRECISION must be more or equal to 0");
assert(methods.includes(process.env.ETHEREUM_CONTRACT_FUNCTION), "ETHEREUM_CONTRACT_FUNCTION must be transfer or mint");

const alreadyProcessed = []

async function main(){
  const hiveEngineDeposits = require("./libs/hive/scanHiveEngineTransactions.js");
  const processHiveEngineDeposit = require("./libs/hive/processHiveEngineDeposit.js");
  const mempool = require("./libs/hive/mempool.js")

  const scanEthereumTransactions = require("./libs/ethereum/scanEthereumTransactions.js")
  const processEthereumTransaction = require("./libs/ethereum/processEthereumTransaction.js")

  console.log("-".repeat(process.stdout.columns ? process.stdout.columns : 69))
  console.log(`Wrapped Hive Engine Orace\nCopyright: @fbslo, 2020\n`)
  console.log(`Token Symbol: ${process.env.TOKEN_SYMBOL}\nHive account: ${process.env.HIVE_ACCOUNT}\nEthereum contract: ${process.env.ETHEREUM_CONTRACT_ADDRESS}`)
	console.log("-".repeat(process.stdout.columns ? process.stdout.columns : 69))
	
	bridge.init({ game_api_url: process.env.GAME_API_URL, prefix: process.env.TX_PREFIX });
	bridge.stream(onGameTx, ['token_transfer']);

  /*track new HE transactions
  hiveEngineDeposits.start((tx) => {
    processHiveEngineDeposit.start(tx)
      .then(async (result) => {
        if (result === 'deposit_refunded') console.log(`Invalid deposit transaction ${tx.transactionId} by ${tx.sender} refunded!`)
        else if (result === 'valid_deposit') {
          let payload = JSON.parse(tx.payload)
          console.log(`New HE deposit detected! ${payload.quantity} ${process.env.TOKEN_SYMBOL} sent by ${tx.sender} with memo: [${payload.memo}]`)
					let receipt = await sendEthereumTokens.start(payload.quantity, payload.memo, tx.sender, logger);
					console.log(`Ethereum transaction sent: ${receipt.transactionHash}`);
        }
      })
      .catch((err) => {
        console.log(`[!] Error while processing HE deposit:`, err)
        logger.log('error', `Error while processing HE deposit: ${err}`)
      })
  })*/

  //check for new ERC20 deposits every minute
  schedule.scheduleJob('* * * * *', () => {
    scanEthereumTransactions.start((tx) => {
      processEthereumTransaction.start(tx)
        .then(async (result) => {
          if (!alreadyProcessed.includes(result.hash)){
            alreadyProcessed.push(result.hash) //prevent double spend
						//processHiveEngineDeposit.transfer(result.username, result.amount, result.hash)
						let hive_tx = await sendDEC(result.username, result.amount, result.hash);
						utils.log(`Sent ${result.amount} DEC to ${result.username}.`);
          }
        })
        .catch((err) => {
          console.log(`[!] Error while processing Ethereum transaction:`, err)
          logger.log('error', `Error while processing Ethereum transaction: ${err}`)
        })
    })
  })

  //highly experimental, don't use in production yet
  if (process.env.VERIFY_SECONDARY_NODE === 'true'){
    mempool.start(logger)
  }
}

async function onGameTx(tx) {
	let data = utils.tryParse(tx.data);

	if(data.to != process.env.HIVE_ACCOUNT)
		return;

	// TODO: Validate proper Ethereum address in memo

	try {
		switch(tx.type) {
			case 'token_transfer':
				// Make sure they are sending DEC
				if(data.token != process.env.TOKEN_SYMBOL)
					return;

				utils.log(`New game deposit detected! ${data.qty} ${process.env.TOKEN_SYMBOL} sent by ${tx.player} with memo: [${data.memo}]`)
				let receipt = await sendEthereumTokens.start(data.qty, data.memo, tx.player, logger);
				utils.log(`Ethereum transaction sent: ${receipt.transactionHash}`);
				break;
		}
	} catch (err) {
		utils.log(`Error processing game deposit: ${err}`, 1, 'Red');
	}
}

async function sendDEC(to, qty, memo) {
	return await hive.custom_json(
		`${process.env.TX_PREFIX}token_transfer`,
		{ to, qty, token: process.env.TOKEN_SYMBOL, type: "deposit", memo },
		process.env.HIVE_ACCOUNT,
		process.env.HIVE_ACCOUNT_PRIVATE_KEY,
		true
	);
}

database.connect()
  .then(async (db) => {
    const setup = require("./libs/setup/setup.js")
    let isFirstSetup = await setup.isFirstSetup()
    if (isFirstSetup) await setup.databaseSetup(db)
    main()
  })
  .catch((e) => console.error(e))
