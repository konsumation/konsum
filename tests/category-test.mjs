import test from "ava";
import tmp from "tmp";

import { prepareDatabase } from "../src/database";
import { Category } from "../src/category";

const config = {
  database: {
    path: "/tmp/db" // tmp.tmpNameSync()
  }
};

test("categories", async t => {
  //console.log(config.database.path);
  const db = await prepareDatabase(config);

  for (let i = 0; i < 1000; i++) {
    const c = new Category(`CDDFXGGH-${i}`, "kWh");
    c.write(db);
  }

  for await (const c of Category.entries(db)) {
    console.log(c);
  }

  db.close();
});
