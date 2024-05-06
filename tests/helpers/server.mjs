import { readFileSync, createReadStream } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import getPort from "@ava/get-port";
import { setSchema } from "@konsumation/db-postgresql";
import { prepareHttpServer } from "../../src/http.mjs";
import { prepareDatabase } from "../../src/database.mjs";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

const sd = { notify: () => {}, listeners: () => [] };

const defaultUsers = {
  admin: {
    password: "start123",
    entitlements: [
      "konsum",
      "konsum.admin.backup",
      "konsum.admin.reload",
      "konsum.admin.stop",
      "konsum.admin.token",
      "konsum.category.get",
      "konsum.category.add",
      "konsum.category.modify",
      "konsum.category.delete",
      "konsum.value.get",
      "konsum.value.add",
      "konsum.value.delete",
      "konsum.meter.get",
      "konsum.meter.add",
      "konsum.meter.modify",
      "konsum.meter.delete",
      "konsum.note.get",
      "konsum.note.add",
      "konsum.note.modify",
      "konsum.note.delete"
    ]
  }
};

export async function createConfig(
  context,
  port = 3150,
  users = defaultUsers,
  database
) {
  const configDir = pn(`../../build/config-${port}`);

  await mkdir(configDir, {
    recursive: true
  });

  const configFile = `${configDir}/config.json`;
  const config = {
    version: "1.2.3",
    database,
    auth: {
      jwt: {
        public: readFileSync(pn("../../config/demo.rsa.pub")),
        private: readFileSync(pn("../../config/demo.rsa")),
        options: {
          algorithm: "RS256"
        }
      },
      users: {
        ...users
      }
    },
    http: {
      port
    }
  };

  context.config = config;
  context.port = config.http.port;
  context.url = `http://localhost:${config.http.port}`;
  context.configDir = configDir;
  context.configFile = configFile;

  await writeFile(configFile, JSON.stringify(config, undefined, 2), "utf8");
  return config;
}

export async function startServer(context, port, database, users, dataFile) {
  const config = await createConfig(context, port, users, database);
  const { master } = await prepareDatabase(config);
  const { server } = await prepareHttpServer(config, sd, master);

  if (dataFile) {
    await master.fromText(createReadStream(dataFile, "utf8"));
  } else {
    await wait(50);
  }

  const response = await fetch(`http://localhost:${port}/authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: config.auth.users.admin.password
    })
  });

  context.token = (await response.json()).access_token;
  context.master = master;
  context.server = server;
}

export async function stopServer(context) {
  context.server?.close();
  context.server?.unref();
  await context.master?.close();
}

export async function wait(msecs = 1000) {
  await new Promise(resolve => setTimeout(resolve, msecs));
}

export async function* allContexts(context, users, dataFile) {
  const dbs = [
    async port => {
      const databaseFile = pn(`../build/db-${port}`);
      return {
        title: "level",
        database: { "@konsumation/db-level": databaseFile },
        async cleanup() {
          await rm(databaseFile, { recursive: true });
        }
      };
    }
  ];

  if (process.env.POSTGRES_URL) {
    dbs.push(async port => {
      const schemaName = `testintegration${port}`;
      const sql = postgres(process.env.POSTGRES_URL);
      await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
      await sql`CREATE SCHEMA ${sql(schemaName)}`;
      return {
        title: "postgres",
        database: {
          "@konsumation/db-postgresql": setSchema(
            process.env.POSTGRES_URL,
            schemaName
          )
        },
        async cleanup() {
          await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
          await sql.end();
        }
      };
    });
  }

  for (const db of dbs) {
    const port = await getPort();
    const { database, cleanup, title } = await db(port);
    context.title = title;
    await startServer(context, port, database, users, dataFile);

    try {
      yield context;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      await stopServer(context);
      await cleanup();
    }
  }
}

export async function execAllContexts(t, exec, ...args) {
  for await (const context of allContexts(t.context)) {
    t.log(context.title);
    try {
      await exec(t, ...args);
    } catch (e) {
      t.log(e);
    }
  }
}

execAllContexts.title = (providedTitle = "databases") =>
  `${providedTitle}`.trim();
