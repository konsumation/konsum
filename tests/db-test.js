import { prepareDatabase, insertIntoDatabase } from '../src/database';
import test from 'ava';

const sqlite3 = require('sqlite3').verbose(),
  tmp = require('tmp'),
  tmpObj = tmp.tmpNameSync();

const config = {
  database: {
    file: tmpObj
  }
};

//select from table,
test('insert after create', async t => {
  const database = await prepareDatabase(config);

  const p = new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run(
        "INSERT INTO Konsum (date,amount,type) values ('31012017',120.5,'strom')"
      );
      database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
        resolve(row)
      );
    });
  });

  const row = await p;
  t.is(row.type, 'strom');

  database.close();
});

test('insert as a function', async t => {
  const database = await prepareDatabase(config);
  const insert = await insertIntoDatabase(
    database,
    '31012017',
    120.5,
    'insert'
  );

  const p = new Promise((resolve, reject) => {
    database.serialize(() => {
      database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
        resolve(row)
      );
    });
  });
  const row = await p;
  t.is(row.type, 'insert');

  database.close();
});
