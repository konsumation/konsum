import test from "ava";
import tmp from "tmp";

import { prepareDatabase } from "../src/database";

const level = require("level");

const config = {
  database: {
    path: tmp.tmpNameSync()
  }
};

test("insert after create", async t => {
  const db = prepareDatabase(config);
  db.put("foo", "bar");
  const value = await db.get("foo");
  t.is(value, "bar");
  await db.close();
});

test.cb("test db", t => {
  const config = {
    database: {
      path: tmp.tmpNameSync()
    }
  };

  const db = prepareDatabase(config);

  db.put("k1", "v1");
  db.put("k2", "v2");
  db.createReadStream()
    .on("data", data => {
      console.log(data.key, "=", data.value);
    })
    .on("error", err => {
      console.log("Oh my!", err);
    })
    .on("close", () => {
      console.log("Stream closed");
    })
    .on("end", () => {
      console.log("Stream ended");
      t.end();
    });
});
