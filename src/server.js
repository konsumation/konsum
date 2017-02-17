/* jslint node: true, esnext: true */

'use struct';

const program = require('commander');
const sqlite3 = require('sqlite3').verbose();

program
  .description('Konsum server')
//  .version(module.exports.version)
  .option('-db, --database <file>', 'database file')
  .parse(process.argv);

const db = new sqlite3.Database(program.database);

db.serialize( () => {
  db.run("CREATE TABLE lorem (info TEXT)");

  var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
  for (let i = 0; i < 10; i++) {
    stmt.run("Ipsum " + i);
  }
  stmt.finalize();

  db.each("SELECT rowid AS id, info FROM lorem", (err, row) => console.log(row.id + ": " + row.info));
});

db.close();
