import program from "commander";
import { resolve } from "path";
import { createWriteStream, createReadStream } from "fs";
import { expand } from "config-expander";
import { removeSensibleValues } from "remove-sensible-values";
import { Category, backup, restore } from "konsum-db";
import { prepareDatabase, defaultDatabaseConfig } from "./database.mjs";
import { prepareHttpServer, defaultHttpServerConfig } from "./http.mjs";
import { defaultAuthConfig } from "./auth.mjs";
import { version, description } from "../package.json";

program
  .description(description)
  .version(version)
  .option("-c, --config <directory>", "use config from directory");

program.command("start").action(async () => {
  const { sd, config, database, meta } = await prepareConfig();

  console.log(removeSensibleValues(config));

  // prepare the web-server with the config and the database
  const http = await prepareHttpServer(config, sd, database, meta);
});

program.command("list").action(async (cName, command) => {
  const { database } = await prepareConfig();

  for await (const c of Category.entries(database, cName, cName)) {
    for await (const { value, time } of c.values(database)) {
      console.log(c.name, new Date(time * 1000), value);
    }
  }
});

program.command("backup").action(async (output, command) => {
  const { database, meta } = await prepareConfig();
  await backup(
    database,
    meta,
    command === undefined
      ? process.stdout
      : createWriteStream(output, { encoding: "utf8" })
  );
});

program.command("restore").action(async (input, command) => {
  const { database } = await prepareConfig();
  await restore(
    database,
    command === undefined
      ? process.stdin
      : createReadStream(input, { encoding: "utf8" })
  );
});


program.command("insert").action(async (cName, value, time, command) => {
  const { database } = await prepareConfig();

  time = time === undefined ? Date.now() : new Date(time).valueOf();

  time = time / 1000;

  if (time < 941673600 || time > 2000000000) {
    console.log("time out of range");
    return;
  }

  const c = await Category.entry(database, cName);

  await c.writeValue(database, value, time);
});

program.parse(process.argv);

async function prepareConfig() {
  let sd = { notify: () => {}, listeners: () => [] };
  try {
    sd = await import("sd-daemon");
  } catch (e) {}
  sd.notify("STATUS=starting");

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
      ...defaultAuthConfig,
      ...defaultDatabaseConfig,
      ...defaultHttpServerConfig
    }
  });

  const listeners = sd.listeners();
  if (listeners.length > 0) config.http.port = listeners[0];

  // prepare the database with the config

  return { sd, config, ...(await prepareDatabase(config, sd)) };
}
