/* global describe, it, xit, before, after */
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const tmp = require('tmp');
const tmpObj = tmp.tmpNameSync();
console.log(tmpObj);

const config = {
  database: {
    file: tmpObj
  }
};

const db = new sqlite3.Database(config.database.file);

import {
  prepareDatabase
}
from '../src/database';


//select from table,
xit('table exist??? after create', async() => {
  const x = await prepareDatabase(config);

  db.serialize(function() {
    db.run("INSERT INTO Konsum (date,amount,type) values ('31012017',120.5,'strom')");
    db.each('SELECT date,amount,type info FROM Konsum', function(err, row) {
      console.log(row);
    });
  });

  db.close();
});
