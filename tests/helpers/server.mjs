import { readFileSync, createReadStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import got from "got";

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

export async function startServer(
  t,
  port = 3150,
  users = defaultUsers,
  dataFile
) {
  await mkdir(pn("../../build"), {
    recursive: true
  });

  const file = pn(`../../build/db-${port}`);
  const config = {
    version: "1.2.3",
    database: {
      "@konsumation/db-level": file
    },
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

  const { master } = await prepareDatabase(config);
  const { server } = await prepareHttpServer(config, sd, master);

  if (dataFile) {
    await master.fromText(createReadStream(dataFile, "utf8"));
  } else {
    await wait(50);
  }

  const response = await got.post(`http://localhost:${port}/authenticate`, {
    json: {
      username: "admin",
      password: users.admin.password
    }
  });

  t.context.token = JSON.parse(response.body).access_token;
  t.context.master = master;
  t.context.databaseFile = file;
  t.context.server = server;
  t.context.config = config;
  t.context.port = port;
  t.context.url = `http://localhost:${port}`;
}

export async function stopServer(t) {
  t.context.server.close();
  t.context.server.unref();
  await t.context.master.close();
  await rm(t.context.databaseFile, { recursive: true });
}

export async function wait(msecs = 1000) {
  await new Promise(resolve => setTimeout(resolve, msecs));
}
