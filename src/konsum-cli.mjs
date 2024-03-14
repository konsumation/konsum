#!/usr/bin/env node
import { readFileSync, createWriteStream, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { expand } from "config-expander";
import { Category } from "@konsumation/db-level";
import { prepareDatabase, defaultDatabaseConfig } from "./database.mjs";
import { prepareHttpServer, defaultHttpServerConfig } from "./http.mjs";
import { defaultAuthConfig } from "./auth.mjs";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}
const encodingOptions = {
  endoding: "utf8"
};

const { version, description } = JSON.parse(
  readFileSync(pn("../package.json"), encodingOptions)
);

program
  .description(description)
  .version(version)
  .option("-c, --config <directory>", "use config from directory");

program.command("start").action(async () => {
  const { sd, config, master } = await prepareConfig();

  // prepare the web-server with the config and the database
  const http = await prepareHttpServer(config, sd, master);
});

program.command("list <category>").action(async cName => {
  const { master } = await prepareConfig();

  for await (const c of Category.entries(master.db, cName, cName)) {
    for await (const { value, time } of c.values(master.db)) {
      console.log(c.name, new Date(time * 1000), value);
    }
  }

  await master.close();
});

program.command("backup [file]").action(async output => {
  const { master } = await prepareConfig();
  await master.backup(
    output === undefined
      ? process.stdout
      : createWriteStream(output, encodingOptions)
  );
  await master.close();

  if (output !== undefined) {
    console.log(`${output} saved`);
  }
});

program.command("restore [file]").action(async input => {
  const { master } = await prepareConfig();
  const { numberOfValues, numberOfCategories } = await master.restore(
    input === undefined
      ? process.stdin
      : createReadStream(input, encodingOptions)
  );
  await master.close();
  console.log(`${input} restored (${numberOfCategories} categories, ${numberOfValues} values)`);
});

program
  .command("insert <category> <value> [time]")
  .action(async (cName, value, time) => {
    const { master } = await prepareConfig();

    time = time === undefined ? Date.now() : new Date(time).valueOf();

    time = Math.round(time / 1000);

    if (time < 941673600 || time > 2000000000) {
      console.log("Time out of range");
      return;
    }

    const c = await Category.entry(master.db, cName);

    if (c) {
      await c.writeValue(master.db, value, time);
    } else {
      console.log("No such category", cName);
    }
  });

program.parse(process.argv);

async function prepareConfig() {
  const options = program.opts();
  let sd = { notify: () => {}, listeners: () => [] };
  try {
    sd = await import("sd-daemon");
  } catch (e) {}
  sd.notify("STATUS=starting");

  const configDir = process.env.CONFIGURATION_DIRECTORY || options.config;

  // some constants used while loading the configuration
  const constants = {
    basedir: configDir || process.cwd(), // where is the config file located
    installdir: pn("."), // make references to the installdir possible
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
