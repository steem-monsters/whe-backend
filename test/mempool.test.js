const mempool = require("../src/libs/hive/scanHiveEngineTransactions.js")
const assert = require('assert');
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const adapter = new FileAsync('./database/database.json')

describe('Mempool Test', () => {
  it('should add transaction to mempool', async () => {
   low(adapter)
    .then(db => {
      db.get('mempool')
       .push({ id: 'test', tx: { test: true } })
       .write()
      let mempool_data = db.get("transactions").find({ id: 1 }).value()
      assert.equal(mempool_data.id, 'test');
      assert.equal(mempool_data.tx, { test: true })
    });
  });
  it('should remove transaction from mempool', async () => {
    low(adapter)
     .then(db => {
       db.get('mempool') //remove tx from mempool
         .remove({ id: 'test' })
         .write()

       let mempool_data = db.get("mempool").find({ id: 1 }).value()
       assert.equal(mempool_data.id, undefined);
       assert.equal(mempool_data.tx, undefined);
     });
  })
});
