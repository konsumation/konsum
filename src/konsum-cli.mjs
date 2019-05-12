import program from "commander";
import { resolve } from "path";
import { expand } from "config-expander";
import { removeSensibleValues } from "remove-sensible-values";
import { prepareDatabase, defaultDatabaseConfig } from "./database";
import { prepareHttpServer, defaultHttpServerConfig } from "./http";
import { version, description } from "../package.json";

program
  .description(description)
  .version(version)
  .option("-c, --config <directory>", "use config from directory")
  .action(async () => {
    let sd = { notify: () => {}, listeners: () => [] };
    try {
      sd = await import("sd-daemon");
    } catch (e) {}
    sd.notify("READY=1\nSTATUS=starting");

    const configDir = process.env.CONFIGURATION_DIRECTORY || program.config;

    // some constants used while loading the configuration
    const constants = {
      basedir: configDir || process.cwd(), // where is the config file located
      installdir: resolve(__dirname, ".."), // make references to the installdir possible
      statedir: process.env.STATE_DIRECTORY || process.cwd()
    };

    // load config and expand expressions ${something} inside
    const config = await expand(configDir ? "${include('config.json')}" : {}, {
      constants,
      default: {
        version,
        description,
        ...defaultDatabaseConfig,
        ...defaultHttpServerConfig
      }
    });

    const listeners = sd.listeners();
    if (listeners.length > 0) config.http.port = listeners[0];

    console.log(removeSensibleValues(config));
    // prepare the database with the config
    const db = await prepareDatabase(config, sd);

    // prepare the web-server with the config and the database
    const http = await prepareHttpServer(config, sd, database);
  })
  .parse(process.argv);
