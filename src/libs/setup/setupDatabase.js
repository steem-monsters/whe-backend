async function initialSetup(database){
  await setLastProcessedBlock(database);
  await setAllEthereumTransactions(database);
}

async function setLastProcessedBlock(database){
  await database.put("last_eth_block", 500)
  console.log("DB: last_eth_block - OK")
}

async function setAllEthereumTransactions(database){
  database.put("all_ethereum_transactions", JSON.stringify({}))
  console.log("DB: all_ethereum_transactions - OK")
}

module.exports.initialSetup = initialSetup
