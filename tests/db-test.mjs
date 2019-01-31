import test from "ava";
import tmp from "tmp";

import { prepareDatabase, insertCategory, categories } from "../src/database";
import { Category } from "../src/category";

const config = {
  database: {
    path: "/tmp/db" // tmp.tmpNameSync()
  }
};

test.skip("categories", async t => {
  //console.log(config.database.path);
  const db = await prepareDatabase(config);

  for(let i = 0; i < 1000; i++) {
    insertCategory(db, new Category("CDDFXGGH-" + i));
  }

  for await (const c of categories(db)) {
    console.log(c);
  }

  db.close();
});

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
