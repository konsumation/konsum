import { readFileSync } from "fs";
import { mkdir, rmdir } from "fs/promises";
import got from "got";

import { prepareHttpServer } from "../../src/http.mjs";
import { prepareDatabase } from "../../src/database.mjs";

const sd = { notify: () => {}, listeners: () => [] };

let port = 3149;

const defaultUsers = {
  admin: {
    password: "start123",
    entitlements: [
      "konsum",
      "konsum.admin.backup",
      "konsum.category.add",
      "konsum.category.update",
      "konsum.category.delete",
      "konsum.value.add",
      "konsum.value.delete",
      "konsum.meter.add",
      "konsum.meter.update",
      "konsum.meter.delete",
      "konsum.note.add",
      "konsum.note.update",
      "konsum.note.delete"
    ]
  }
};

export async function startServer(t, users = defaultUsers) {
  await mkdir(new URL("../../build", import.meta.url).pathname, {
    recursive: true
  });

  port++;

  const file = new URL(`../../build/db-${port}`, import.meta.url).pathname;
  const config = {
    version: "1.2.3",
    database: {
      file
    },
    auth: {
      jwt: {
        public: readFileSync(
          new URL("../../config/demo.rsa.pub", import.meta.url).pathname
        ),
        private: readFileSync(
          new URL("../../config/demo.rsa", import.meta.url).pathname
        ),
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

  await wait(2000);

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
  t.context.port = port;
  t.context.url = `http://localhost:${port}`;
}

export async function stopServer(t) {
  t.context.server.close();
  t.context.server.unref();
  await t.context.master.close();
  await rmdir(t.context.databaseFile, { recursive: true });
}


export async function wait(msecs=1000) {
    await new Promise((resolve) => setTimeout(resolve,msecs));
}