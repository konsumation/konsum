const path = require('path'),
  program = require('caporal');

import { expand } from 'config-expander';
import { prepareDatabase } from './database';
import { prepareHttpServer } from './http';

program
  .description('Konsum server')
  .version(require(path.join(__dirname, '..', 'package.json')).version)
  .option('-c, --config <file>', 'use config from file')
  .action(async (args, options, logger) => {
    // some constants used while loading the configuration
    const constants = {
      basedir: path.dirname(options.config || process.cwd()), // where is the config file located
      installdir: path.resolve(__dirname, '..') // make references to the installdir possible
    };

    // default config if none is given
    const defaultConfig = {
      database: {
        file: 'level.db'
      },
      http: {
        port: 123456
      }
    };

    // load config and expand expressions ${something} inside
    const config = await expand(
      options.config
        ? "${include('" + path.basename(options.config) + "')}"
        : defaultConfig,
      {
        constants
      }
    );

    // prepare the database with the config
    const db = await prepareDatabase(config);

    // prepare the web-server with the config and the database
    const http = await prepareHttpServer(config, db);
  });

program.parse(process.argv);
