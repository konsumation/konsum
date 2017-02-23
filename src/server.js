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

import {
  prepareDatabase
}
from './database';

program
  .description('Konsum server')
  //  .version(module.exports.version)
  .option('-c, --config <file>', 'use config from file')
  .parse(process.argv);

const constants = {
  basedir: path.dirname(program.config || process.cwd()),
  installdir: path.resolve(__dirname, '..')
};

const defaultConfig = {
  database: 'sample.sqlite',
  http: {
    port: 123456
  }
};

expand(program.config ? "${include('" + path.basename(program.config) + "')}" : defaultConfig, { constants })
  .then(config => prepareDatabase(config).then(db => {

    const app = new Koa();

    // if there is a cert configured use https otherwise plain http
    const server = config.http.cert ? https.createServer(config.http, app.callback()) : http.createServer(app.callback());
    server.on('error', err => console.log(err));

    app.listen(config.http.port, () => console.log(`Listening on port ${config.http.port}`));

    db.close();
  }));
