import test from 'ava';
import { prepareDatabase } from '../src/database';
const level = require('level')

const tmp = require('tmp'),
  tmpObj = tmp.tmpNameSync();

const config = {
  database: {
    file: tmpObj
  }
};


test('insert after create', async t => {
  const db = prepareDatabase(config);
  db.put('foo', 'bar');
  const value = await db.get('foo');
  t.is(value, 'bar')
  db.close();
});



test.cb('test db', t => {
  const db = level('./mydb')
  db.put('k1', 'v1');
  db.put('k2', 'v2');
  //console.log(await db.get('k1'));~
   db.createReadStream()
    .on('data', function (data) {
      console.log('hallo')
      console.log(data.key, '=', data.value)
    })
    .on('error', function (err) {
      console.log('Oh my!', err)
    })
    .on('close', function () {
      console.log('Stream closed')
    })
    .on('end', function () {
      console.log('Stream ended')
      t.end();
    })

});
