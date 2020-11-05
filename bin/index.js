#!/usr/bin/env node

require('dotenv').config();
const { MongoClient } = require('mongodb');

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

function getStatus(){
  connect().then(async (database) => {
    let result = await database.db("oracle").collection("status").find({}).toArray()
    console.log(`Last processed Ethereum block: ${result[0].block}`)
  })
}

getStatus()
