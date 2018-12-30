const program = require("caporal");

import { dirname, resolve, basename } from "path";
import { expand } from "config-expander";
import { prepareDatabase } from "./database";
import { prepareHttpServer } from "./http";
import { version } from "../package.json";

program
  .description("Konsum server")
  .version(version)
  .option("-c, --config <file>", "use config from file")
  .action(async (args, options, logger) => {
    // some constants used while loading the configuration
    const constants = {
      basedir: dirname(options.config || process.cwd()), // where is the config file located
      installdir: resolve(__dirname, "..") // make references to the installdir possible
    };

    // default config if none is given
    const defaultConfig = {
      database: {
        file: "level.db"
      },
      http: {
        port: 123456
      }
    };

    // load config and expand expressions ${something} inside
    const config = await expand(
      options.config
        ? "${include('" + basename(options.config) + "')}"
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
