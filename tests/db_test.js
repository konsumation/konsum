/* global describe, it, xit, before, after */
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  sqlite3 = require('sqlite3').verbose(),
  tmp = require('tmp'),
  tmpObj = tmp.tmpNameSync();

const config = {
  database: {
    file: tmpObj
  }
};

import {
  prepareDatabase //,
  //insertIntoDatabase
}
from '../src/database';


//select from table,
it('insert after create', async() => {
  const database = await prepareDatabase(config);

  database.serialize(() => {
    database.run("INSERT INTO Konsum (date,amount,type) values ('31012017',120.5,'strom')");
    database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
      chai.assert.equal(row.type, 'strom')
    );
  });

  database.close();
});

xit('insert as a function', async() => {
  const insert = await insertIntoDatabase(config, '31012017', 120.5, 'insert');

  database.serialize(() => {
    database.each('SELECT date,amount,type FROM Konsum', (err, row) =>
      chai.assert.equal(row.type, 'insert')
    );
  });

  database.close();
});
