/* jslint node: true, esnext: true */

'use struct';

const  sqlite3 = require('sqlite3').verbose();

export function prepareDatabase(config) {
  const db = new sqlite3.Database(config.database);

  return new Promise((fullfill, reject) => {
    db.serialize(() => {
      //db.run("CREATE TABLE lorem (info TEXT)");

      const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
      for (let i = 0; i < 10; i++) {
        stmt.run("Ipsum " + i);
      }
      stmt.finalize();

      db.each("SELECT rowid AS id, info FROM lorem", (err, row) => console.log(row.id + ": " + row.info));

      fullfill(db);
    });
  });
}
