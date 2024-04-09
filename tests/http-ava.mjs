import test from "ava";
import got from "got";
import { startServer, stopServer } from "./helpers/server.mjs";

let port = 3150;

test.beforeEach(t => startServer(t, port++));
test.afterEach(t => stopServer(t));

test("list categories", async t => {
  const response = await got.get(`${t.context.url}/category`, {
    headers: { Authorization: `Bearer ${t.context.token}` }
  });

  t.is(response.statusCode, 200);
});

test("update category", async t => {
  const response = await got.put(`${t.context.url}/category/CAT7`, {
    headers: { Authorization: `Bearer ${t.context.token}` },
    json: {
      description: "a new Unit",
      unit: "m3"
    }
  });

  t.is(response.statusCode, 200);
});

test("delete category unknown", async t => {
  try {
    const response = await got.delete(`${t.context.url}/category/CAT7777`, {
      headers: { Authorization: `Bearer ${t.context.token}` }
    });
    t.is(response.statusCode, 404);
  } catch (e) {
    t.is(e.message, "Response code 404 (Not Found)");
  }
});

test("delete category", async t => {
  let response = await got.put(`${t.context.url}/category/CAT7`, {
    headers: { Authorization: `Bearer ${t.context.token}` },
    json: {
      description: "a new Unit",
      unit: "m3"
    }
  });

  response = await got.delete(`${t.context.url}/category/CAT7`, {
    headers: { Authorization: `Bearer ${t.context.token}` }
  });
  t.is(response.statusCode, 200);
});

test("list category meters", async t => {
  const master = t.context.master;
  const catName = "CAT1";

  const category = master.addCategory({ name: catName, unit: "kWh" });
  await category.write(master.context);
  const meter1 = category.addMeter({ name: "M-1", serial: "12345" });
  await meter1.write(master.context);
  const meter2 = category.addMeter({ name: "M-2", serial: "123456" });
  await meter2.write(master.context);

  const response = await got.get(`${t.context.url}/category/${catName}/meter`, {
    headers: { Authorization: `Bearer ${t.context.token}` }
  });

  t.is(response.statusCode, 200);

  t.deepEqual(JSON.parse(response.body), [
    {
      name: "M-1",
      fractionalDigits: 2,
      serial: "12345",
      unit: "kWh",
      validFrom: "1970-01-01T00:00:00.000Z"
    },
    {
      name: "M-2",
      fractionalDigits: 2,
      serial: "123456",
      unit: "kWh",
      validFrom: "1970-01-01T00:00:00.000Z"
    }
  ]);
});

test("insert category meters", async t => {
  const master = t.context.master;
  const catName = "CAT2";

  const category = master.addCategory({ name: catName, unit: "kWh" });
  await category.write(master.context);

  let response = await got.put(`${t.context.url}/category/${catName}/meter`, {
    headers: { Authorization: `Bearer ${t.context.token}` },
    json: {
      name: "M-3",
      fractionalDigits: 2,
      serial: "123456",
      unit: "kWh",
      validFrom: "1970-01-01T00:00:00.000Z"
    }
  });

  t.is(response.statusCode, 200);

  response = await got.get(`${t.context.url}/category/${catName}/meter`, {
    headers: { Authorization: `Bearer ${t.context.token}` }
  });

  t.is(response.statusCode, 200);

  t.deepEqual(JSON.parse(response.body), [
    {
      name: "M-3",
      fractionalDigits: 2,
      serial: "123456",
      unit: "kWh",
      validFrom: "1970-01-01T00:00:00.000Z"
    }
  ]);
});

test("list category notes", async t => {
  const catName = "CAT1";
  const master = t.context.master;

  const category = master.addCategory({ name: catName, unit: "kWh" });
  await category.write(master.context);
  const meter = category.addMeter({ name: catName });
  await meter.write(master.context);

  const time = Date.now();
  const note1 = meter.addNote({ name: time - 1, meter, description: "a text" });
  await note1.write(master.context);
  const note2 = meter.addNote({ name: time, meter, description: "a text" });
  await note2.write(master.context);

  const response = await got.get(`${t.context.url}/category/${catName}/note`, {
    headers: { Authorization: `Bearer ${t.context.token}` }
  });

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
  const catName = "CAT1";
  const meterName = "M1";
  const now = new Date();

  const category = master.addCategory({ name: catName, unit: "kWh" });
  await category.write(master.context);
  const meter = category.addMeter({ name: meterName });
  await meter.write(master.context);
  await meter.writeValue(master.context, new Date(now.getTime() - 1000), 77.34);

  let response;

  response = await got.post(`${t.context.url}/category/${catName}/value`, {
    headers: { Authorization: `Bearer ${t.context.token}` },
    json: {
      value: 78.0
    }
  });

  t.deepEqual(JSON.parse(response.body), { message: "inserted" });

  response = await got.get(`${t.context.url}/category/${catName}/value`, {
    headers: {
      Accept: "text/plain",
      Authorization: `Bearer ${t.context.token}`
    }
  });

  t.regex(response.body, /\s+77.34/);
  t.regex(response.body, /\s+78/);

  response = await got.get(
    `${t.context.url}/category/${catName}/meter/M1/value`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${t.context.token}`
      }
    }
  );

  t.is(JSON.parse(response.body)[0].value, 77.34);
});

test.serial("can insert + can delete", async t => {
  const master = t.context.master;
  const catName = "CAT1";
  const meterName = "M1";
  const now = new Date();

  const category = master.addCategory({ name: catName, unit: "kWh" });
  await category.write(master.context);
  const meter = category.addMeter({ name: meterName });
  await meter.write(master.context);
  await category.writeValue(master.context, now, 77.34);

  let response = await got.get(`${t.context.url}/category/${catName}/value`, {
    headers: {
      Accept: "text/plain",
      Authorization: `Bearer ${t.context.token}`
    }
  });
  //t.log(response.body);
  t.regex(response.body, /\s+77.34/);
  response = await got.get(`${t.context.url}/category/${catName}/value`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${t.context.token}`
    }
  });

  t.is(JSON.parse(response.body)[0].value, 77.34);
  response = await got.delete(`${t.context.url}/category/${catName}/value`, {
    headers: { Authorization: `Bearer ${t.context.token}` },
    json: {
      key: now
    }
  });
  t.is(await meter.getValue(master.context, now), undefined);
});
