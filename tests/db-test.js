import test from 'ava';
import { prepareDatabase, insertIntoDatabase } from '../src/database';

const sqlite3 = require('sqlite3').verbose();
const tmp = require('tmp');
const tmpObj = tmp.tmpNameSync();

const config = {
  database: {
    file: tmpObj
  }
};

test.cb('insert after create', t => {
  const database = await prepareDatabase(config);

  database.serialize(() => {
    database.run(
      "INSERT INTO Konsum (date,amount,type) values ('31012017',120.5,'strom')"
    );
    database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
      t.is(row.type, 'strom')
    );
  });

  database.close();
});

//select from table,
it('', async () => {
  const database = await prepareDatabase(config);

  database.serialize(() => {
    database.run(
      "INSERT INTO Konsum (date,amount,type) values ('31012017',120.5,'strom')"
    );
    database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
      chai.assert.equal(row.type, 'strom')
    );
  });

  database.close();
});

it('insert as a function', async () => {
  const database = await prepareDatabase(config);
  const insert = await insertIntoDatabase(
    database,
    '31012017',
    120.5,
    'insert'
  );

  database.serialize(() => {
    database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
      chai.assert.equal(row.type, 'insert')
    );
  });

  database.close();
});
