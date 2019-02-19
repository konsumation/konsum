import test from "ava";
import tmp from "tmp";

import { prepareDatabase } from "../src/database";

const config = {
  database: {
    path: "/tmp/db" // tmp.tmpNameSync()
  }
};

test.cb("test db", t => {
  const config = {
    database: {
      path: tmp.tmpNameSync()
    }
  };

  prepareDatabase(config).then(db => {
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
        t.end();
      });
  });
});
