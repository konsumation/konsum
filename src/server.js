/* jslint node: true, esnext: true */

'use struct';

const path = require('path'),
  program = require('caporal'),
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
  .version(require(path.join(__dirname,'..','package.json')).version)
  .option('-c, --config <file>', 'use config from file')
  .action(async (args, options, logger) => {
    const constants = {
      basedir: path.dirname(options.config || process.cwd()),
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

    const config = await expand(options.config
          ? "${include('" + path.basename(options.config) + "')}"
          : defaultConfig,
          { constants });

    const db = await prepareDatabase(config);
    const http = await prepareHttpServer(config, db);

    db.close();
  });

program
  .parse(process.argv);
