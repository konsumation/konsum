/* jslint node: true, esnext: true */

'use struct';

const path = require('path'),
  program = require('commander'),
  http = require('http'),
  https = require('https'),
  sqlite3 = require('sqlite3').verbose(),
  Koa = require('koa');

import {
  expand
}
from 'config-expander';

program
  .description('Konsum server')
  //  .version(module.exports.version)
  .option('-c, --config <file>', 'use config from file')
  .parse(process.argv);

const constants = {
  basedir: path.dirname(program.config || process.cwd()),
  installdir: path.resolve(__dirname, '..')
};

expand(program.config ? "${include('" + path.basename(program.config) + "')}" : {
    database: 'sample.sqlite',
    http: {
      port: 123456
    }
  }, {
    constants
  })
  .then(config => prepareDatabase(config).then(db => {

    const app = new Koa();

    // if there is a cert configured use https otherwise plain http
    const server = config.http.cert ? https.createServer(config.http, app.callback()) : http.createServer(app.callback());
    server.on('error', err => console.log(err));

    app.listen(config.http.port, () => console.log(`Listening on port ${config.http.port}`));

    db.close();
  }));


function prepareDatabase(config) {
  const db = new sqlite3.Database(config.database);

  return new Promise((fullfill, reject) => {
    db.serialize(() => {
      db.run("CREATE TABLE lorem (info TEXT)");

      var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
      for (let i = 0; i < 10; i++) {
        stmt.run("Ipsum " + i);
      }
      stmt.finalize();

      db.each("SELECT rowid AS id, info FROM lorem", (err, row) => console.log(row.id + ": " + row.info));

      fullfill(db);
    });
  });
}
