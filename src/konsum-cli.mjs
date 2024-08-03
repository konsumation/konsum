#!/usr/bin/env -S node --unhandled-rejections=strict --trace-uncaught --trace-warnings --title konsum
import { readFileSync, createWriteStream, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { expand } from "config-expander";
import { prepareDatabase, defaultDatabaseConfig,prepareHttpServer, defaultHttpServerConfig,defaultAuthConfig } from "@konsumation/konsum";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}
const encodingOptions = "utf8";

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

  for await (const category of master.categories(cName, cName)) {
    for await (const { value, date } of category.values(master.context)) {
      console.log(category.name, date, value);
    }
  }

  await master.close();
});

program.command("backup [file]").action(async output => {
  const { master } = await prepareConfig();

  output =
    output === undefined
      ? process.stdout
      : createWriteStream(output, encodingOptions);

  for await (const line of master.text()) {
    output.write(line + "\n");
  }

  await master.close();
});

program.command("restore [file]").action(async input => {
  const { master } = await prepareConfig();
  const statistics = await master.fromText(
    input === undefined
      ? process.stdin
      : createReadStream(input, encodingOptions)
  );
  await master.close();
  console.log(
    `${input} restored (${statistics.category} categories, ${statistics.meter} meters, ${statistics.value} values, ${statistics.line} lines)`
  );
});

program
  .command("insert <category> <value> [time]")
  .action(async (cName, value, date) => {
    const { master } = await prepareConfig();

    const context = master.context;
    date = new Date(date);

    const category = await master.category(context, cName);

    if (category) {
      const v = await category.addValue(context, { date, value });
      await v.write(context);
    } else {
      console.error("No such category", cName);
    }

    await master.close();
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
