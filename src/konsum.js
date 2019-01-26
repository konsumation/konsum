import program from "commander";
import { resolve, join } from "path";
import { expand } from "config-expander";
import { prepareDatabase } from "./database";
import { prepareHttpServer } from "./http";
import { version, description } from "../package.json";

program
  .description(description)
  .version(version)
  .option("-c, --config <directory>", "use config from directory")
  .action(async args => {
    const configDir = process.env.CONFIGURATION_DIRECTORY || program.config;

    // some constants used while loading the configuration
    const constants = {
      basedir: configDir || process.cwd(), // where is the config file located
      installdir: resolve(__dirname, ".."), // make references to the installdir possible
      statedir: process.env.STATE_DIRECTORY || process.cwd()
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
      configDir ? "${include('config.json')}" : defaultConfig,
      {
        constants
      }
    );

    // prepare the database with the config
    const db = await prepareDatabase(config);

    // prepare the web-server with the config and the database
    const http = await prepareHttpServer(config, db);
  })
  .parse(process.argv);
