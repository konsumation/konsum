/* jslint node: true, esnext: true */

'use struct';

const path = require('path'),
  program = require('commander'),
  sqlite3 = require('sqlite3').verbose();

import {
  expand
}
from 'config-expander';

import {
  prepareDatabase
}
from './database';

import {
  prepareHttpServer
}
from './http';

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
  database: {
    file : 'sample.sqlite'
  },
  http: {
    port: 123456
  }
};

expand(program.config ? "${include('" + path.basename(program.config) + "')}" : defaultConfig, {
    constants
  })
  .then(config => Promise.all([
    prepareDatabase(config),
    prepareHttpServer(config)])
  .then(([db,http]) => {

    db.close();
  }));
