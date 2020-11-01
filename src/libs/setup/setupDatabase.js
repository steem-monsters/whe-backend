async function initialSetup(database){
  console.log(`Initializing database...`)
  await setLastProcessedBlock(database);
  await setAllEthereumTransactions(database);
  await setIsFirstSetup(database);
  return;
}

async function setLastProcessedBlock(database){
  await database.put("last_eth_block", 500)
  console.log("DB: last_eth_block - OK")
}

async function setAllEthereumTransactions(database){
  database.put("all_ethereum_transactions", JSON.stringify({}))
  console.log("DB: all_ethereum_transactions - OK")
}

async function setIsFirstSetup(database){
  database.put("is_first_setup", 'true')
  console.log("DB: is_first_setup - OK")
}

module.exports.initialSetup = initialSetup
