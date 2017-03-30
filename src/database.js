/* jslint node: true, esnext: true */

'use struct';

const sqlite3 = require('sqlite3').verbose();

export function prepareDatabase(config) {
  const db = new sqlite3.Database(config.database.file);

  return new Promise((fullfill, reject) => {
    db.serialize(() => {
      db.run(
        'CREATE TABLE if not exists Konsum (date datetime NOT NULL, amount real NOT NULL, type text NOT NULL)'
      );

      //db.run("INSERT INTO Konsum (amount,type) values (120.5,'strom')");
      //db.each("SELECT rowid AS id, info FROM lorem", (err, row) => console.log(row.id + ": " + row.info));

      fullfill(db);
    });
  });
}

export function insertIntoDatabase(db, date, amount, type) {
  return new Promise((fullfill, reject) => {
    db.serialize(() => {
      db.run("INSERT INTO Konsum (date,amount,type) values (date, amount, type)");

      fullfill(db);
    });
  });
}
