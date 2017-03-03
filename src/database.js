/* jslint node: true, esnext: true */

'use struct';

const sqlite3 = require('sqlite3').verbose();

export function prepareDatabase(config) {
  const db = new sqlite3.Database(config.database.file);

  return new Promise((fullfill, reject) => {
    db.serialize(() => {
      //db.run("CREATE TABLE if not exists Konsum (date real NOT NULL, amount real NOT NULL, type text NOT NULL)");

      /*
            const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
            for (let i = 0; i < 10; i++) {
              stmt.run("Ipsum " + i);
            }
            stmt.finalize();
*/

      db.run("CREATE TABLE if not exists Konsum (date datetime NOT NULL, amount real NOT NULL, type text NOT NULL)");

      //db.run("INSERT INTO Konsum (amount,type) values (120.5,'strom')");
      //db.each("SELECT rowid AS id, info FROM lorem", (err, row) => console.log(row.id + ": " + row.info));

      fullfill(db);
    });
  });
}
