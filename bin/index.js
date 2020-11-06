#!/usr/bin/env node

require('dotenv').config();
const { MongoClient } = require('mongodb');
const pm2 = require('pm2');
const readLastLines = require('read-last-lines');
const fs = require("fs")

let command = process.argv[2]
if (!command) console.log("Please use command")

//commands
switch(command) {
  case "help":
    help();
    break;
  case "start":
    start();
    break;
  case "logs":
    logs();
    break;
  case "restart":
    restart();
    break;
  case "stop":
    stop();
    break;
  case "status":
    status();
    break;
}

let connection = null;

function connect(){
  return new Promise((resolve, reject) => {
   MongoClient.connect(process.env.MONGODB, { useUnifiedTopology: true }, function(err, db) {
     if (err) { reject(err); return; };
     resolve(db);
     connection = db;
   });
 });
}

function get(){
  if(!connection) {
      throw new Error('Call connect first!');
  }
  return connection;
}

function status(){
  connect().then(async (database) => {
    let result = await database.db("oracle").collection("status").find({}).toArray()
    pm2.list(async (err, list) => {
      if(err) console.log("Error:", err)
      else {
        let he_block = 0
        fs.readFile('./state_he.json', (err2, result2) => {
          if (err2) he_block = 'error'
          else he_block = JSON.parse(result2.toString()).last_block
          console.log("-".repeat(process.stdout.columns ? process.stdout.columns : 69))
          console.log(`Oracle status:`, list[0].pm2_env.status.toUpperCase())
          console.log(`Last processed Hive Engine block: ${he_block}`)
          console.log(`Last processed Ethereum block: ${result[0].block}`)
          console.log("-".repeat(process.stdout.columns ? process.stdout.columns : 69))
          process.exit(0)
        })
      }
    })
  })
}

function help(){
  console.log(`Commands: start, stop, restart, logs, status\nUsage: oracle command`)
}

function logs(){
  pm2.list('oracle', (err, data) => {
    if(err) console.log(err);
    console.log(data[0].pm2_env.pm_out_log_path)
    console.log(data[0].pm2_env.pm_err_log_path)
    let logs = ''
    readLastLines.read(data[0].pm2_env.pm_err_log_path, 15)
      .then((lines) => {
        logs += lines
        return readLastLines.read(data[0].pm2_env.pm_out_log_path, 15)
      })
      .then((lines) => {
        logs += lines
        console.log(logs)
        console.log("\nFor live logs, please use command: pm2 logs oracle")
        process.exit(0)
      })
  })
}

function start(){
  pm2.start('oracle', (err, proc) => {
    if (err) console.log(err)
    else {
      console.log(`Starting the oracle...`);
      setTimeout(() => { logs() }, 1500)
    }
  })
}

function restart(){
  pm2.restart('oracle', (err, proc) => {
    if (err) console.log(err)
    else console.log(`Restarting the oracle...`)
    process.exit(0)
  })
}

function stop(){
  pm2.stop('oracle', (err, proc) => {
    if (err) console.log(err)
    else console.log(`Shutting down the oracle...`)
    process.exit(0)
  })
}
