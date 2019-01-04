const program = require("caporal");

import { resolve } from "path";
import { expand } from "config-expander";
import { prepareDatabase } from "./database";
import { prepareHttpServer } from "./http";
import { version } from "../package.json";

program
  .description("Konsum server")
  .version(version)
  .option("-c, --config <directory>", "use config from directory")
  .action(async (args, options, logger) => {
    const configDir = options.config;

    console.log(`configDir: ${configDir}`);

    // some constants used while loading the configuration
    const constants = {
      basedir: configDir || process.cwd(), // where is the config file located
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
      configDir
        ? "${include('" + join(configDir, "config.json") + "')}"
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
