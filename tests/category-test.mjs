import test from "ava";
import tmp from "tmp";

import { prepareDatabase } from "../src/database";
import { Category } from "../src/category";

const config = {
  database: {
    path: tmp.tmpNameSync()
  }
};

test("categories", async t => {
  //console.log(config.database.path);
  const db = await prepareDatabase(config);

  for (let i = 0; i < 10; i++) {
    const c = new Category(`CAT-${i}`, { unit: "kWh" });
    c.write(db);
  }

  const cs = [];

  for await (const c of Category.entries(db)) {
    cs.push(c);
  }

  t.true(cs.length >= 10);
  t.is(cs[0].unit, 'kWh');

  db.close();
});
