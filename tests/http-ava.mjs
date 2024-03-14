import test from "ava";
import got from "got";
import { Category, Meter, Note } from "@konsumation/db-level";
import { startServer, stopServer } from "./helpers/server.mjs";

let port = 3150;

test.beforeEach(t => startServer(t,port++));
test.afterEach(t => stopServer(t));

test("list categories", async t => {
  const response = await got.get(
    `${t.context.url}/category`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` }
    }
  );

  t.is(response.statusCode, 200);
});

test("update category", async t => {
  const response = await got.put(
    `${t.context.url}/category/CAT7`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` },
      json: {
        description: "a new Unit",
        unit: "m3"
      }
    }
  );

  t.is(response.statusCode, 200);
});

test("delete category unknown", async t => {
  try {
    const response = await got.delete(
      `${t.context.url}/category/CAT7777`,
      {
        headers: { Authorization: `Bearer ${t.context.token}` }
      }
    );
    t.is(response.statusCode, 404);
  } catch (e) {
    t.is(e.message, "Response code 404 (Not Found)");
  }
});

test("delete category", async t => {
  let response = await got.put(
    `${t.context.url}/category/CAT7`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` },
      json: {
        description: "a new Unit",
        unit: "m3"
      }
    }
  );

  response = await got.delete(
    `${t.context.url}/category/CAT7`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` }
    }
  );
  t.is(response.statusCode, 200);
});

test.serial("list category meters", async t => {
  const master = t.context.master;
  const catName = "CAT1";

  const c = new Category(catName, master, { unit: "kWh" });
  await c.write(master.db);
  const m1 = new Meter("M-1", c, { serial: "12345" });
  await m1.write(master.db);
  const m2 = new Meter("M-2", c, { serial: "123456" });
  await m2.write(master.db);

  const response = await got.get(
    `${t.context.url}/category/${catName}/meter`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` }
    }
  );

  t.is(response.statusCode, 200);

  t.deepEqual(JSON.parse(response.body), [
    { name: "M-1", fractionalDigits: 2, serial: "12345", unit: "kWh" },
    { name: "M-2", fractionalDigits: 2, serial: "123456", unit: "kWh" }
  ]);
});

test.serial("insert category meters", async t => {
  const master = t.context.master;
  const catName = "CAT2";

  const c = new Category(catName, master, { unit: "kWh" });
  await c.write(master.db);

  let response = await got.put(
    `${t.context.url}/category/${catName}/meter`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` },
      json: {
        name: "M-3",
        fractionalDigits: 2,
        serial: "123456",
        unit: "kWh"
      }
    }
  );

  t.is(response.statusCode, 200);

  response = await got.get(
    `${t.context.url}/category/${catName}/meter`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` }
    }
  );

  t.is(response.statusCode, 200);

  t.deepEqual(JSON.parse(response.body), [
    { name: "M-3", fractionalDigits: 2, serial: "123456", unit: "kWh" }
  ]);
});

test("list category notes", async t => {
  const catName = "CAT1";
  const master = t.context.master;

  const c = new Category(catName, master, { unit: "kWh" });
  await c.write(master.db);

  const time = Date.now();
  const n1 = new Note(time - 1, c, { description: "a text" });
  await n1.write(master.db);
  const n2 = new Note(time, c, { description: "a text" });
  await n2.write(master.db);

  const response = await got.get(
    `${t.context.url}/category/${catName}/note`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` }
    }
  );

  t.is(response.statusCode, 200);

  function d(time) {
    const s = "0000000" + time;
    return s.substring(s.length - 9);
  }

  /*
  t.deepEqual(JSON.parse(response.body), [
    { name: d(time -1), description: "a text" },
    { name: d(time), description: "a text" }
  ]);
  */
});

test.serial("can insert + get values", async t => {
  const master = t.context.master;

  const c = new Category(`CAT1`, { unit: "kWh" });
  await c.write(master.db);
  const now = Date.now();
  await c.writeValue(master.db, 77.34, Math.round(now / 1000) - 1);

  let response = await got.post(
    `${t.context.url}/category/CAT1/value`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` },
      json: {
        value: 78.0
      }
    }
  );

  response = await got.get(
    `${t.context.url}/category/CAT1/value`,
    {
      headers: {
        Accept: "text/plain",
        Authorization: `Bearer ${t.context.token}`
      }
    }
  );

  //t.log(response.body);
  t.regex(response.body, /\d+ 77.34/);
  t.regex(response.body, /\d+ 78/);

  response = await got.get(
    `${t.context.url}/category/CAT1/value`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${t.context.token}`
      }
    }
  );

  //t.log(response.body);
  t.is(JSON.parse(response.body)[0].value, 77.34);
});

test.serial("can insert + can delete", async (t) => {
  const master = t.context.master;

  const c = new Category(`CAT2`, { unit: "kWh" });
  await c.write(master.db);
  const now = Date.now();
  await c.writeValue(master.db, 77.34, now);

  let response = await got.get(
    `${t.context.url}/category/CAT2/value`,
    {
      headers: {
        Accept: "text/plain",
        Authorization: `Bearer ${t.context.token}`
      }
    }
  );
  //t.log(response.body);
  t.regex(response.body, /\d+ 77.34/);
  response = await got.get(
    `${t.context.url}/category/CAT2/value`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${t.context.token}`
      }
    }
  );

  t.is(JSON.parse(response.body)[0].value, 77.34);
  response = await got.delete(
    `${t.context.url}/category/CAT2/value`,
    {
      headers: { Authorization: `Bearer ${t.context.token}` },
      json: {
        key: now
      }
    }
  );
  t.is(await c.getValue(master.db, now), undefined);
});
