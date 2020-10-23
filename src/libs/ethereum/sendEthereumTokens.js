const Web3 = require("web3")
const Tx = require('ethereumjs-tx').Transaction;
const axios = require("")
const web3 = new Web3(new Web3.providers.HttpProvider(proceess.env.ETHEREUM_ENDPOINT));

function start(amount, address){
  return new Promise(async (resolve, reject) => {
    try {
      let gasPrice = await getRecomendedGasPrice()
    } catch(e){
      console.log(e)
      reject(e)
    }
  })
}

function getRecomendedGasPrice(){
  return new Promise((resolve, reject) => {
    axios
      .get(`https://ethgasstation.info/api/ethgasAPI.json?api-key=${process.env.ETH_GAS_STATON_API_KEY}`)
      .then(response => {
        let speed = process.env.ETH_FEE_SPEED
        if (response.data[speed]) resolve(response.data[speed] / 10)
        else reject("data_incorrect")
      })
      .catch(err => {
        reject(err)
      });
  })
}

module.exports.start = start
