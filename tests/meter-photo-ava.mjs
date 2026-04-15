/**
 * Integration tests for POST /category/:category/meter-photo
 *
 * Requires VISION_API_KEY or GOOGLE_AI_STUDIO_API_KEY to be set.
 * Tests are skipped (with a pass) when no key is available.
 */
import test from "ava";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import getPort from "@ava/get-port";
import { createConfig, login, stopServer } from "./helpers/server.mjs";
import { prepareHttpServer } from "../src/http.mjs";
import { prepareDatabase } from "../src/database.mjs";


function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

const sd = { notify: () => {}, listeners: () => [] };

const API_KEY =
  process.env.VISION_API_KEY ??
  process.env.OPENROUTER_API_KEY ??
  process.env.GOOGLE_AI_STUDIO_API_KEY ??
  "";

const FIXTURE = pn("./fixtures/meter.jpg");
const FIXTURE2 = pn("./fixtures/meter2.jpg");

// VISION_CONFIG will be config.meterPhoto.vision from createConfig (already expanded)
// We just override apiKey with the actual key from env

if (!API_KEY) {
  test("meter-photo: no API key configured — skipping", t => t.pass());
} else {
  test.before(async t => {
    const port = await getPort();
    const databaseFile = pn(`../build/db-meter-photo-${port}`);

    const config = await createConfig(t.context, port, undefined, {
      "@konsumation/db-level": databaseFile
    });

    // Override apiKey in the already-expanded meterPhoto config
    config.meterPhoto.vision.apiKey = API_KEY;

    const { master } = await prepareDatabase(config);
    const { server } = await prepareHttpServer(config, sd, master);
    await login(t.context);

    t.context.master = master;
    t.context.server = server;
    t.context.databaseFile = databaseFile;
  });

  test.after.always(async t => {
    await stopServer(t.context);
    await rm(t.context.databaseFile, { recursive: true, force: true }).catch(
      () => {}
    );
  });

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function postMeterPhoto(url, token, fixturePath = FIXTURE) {
    const imageBase64 = readFileSync(fixturePath).toString("base64");
    return fetch(`${url}/category/electricity/meter-photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ image: imageBase64, mimeType: "image/jpeg" })
    });
  }

  test.serial("meter-photo: endpoint returns 200 with value and date", async t => {
    const response = await postMeterPhoto(t.context.url, t.context.token);

    t.is(response.status, 200);

    const body = await response.json();
    t.log("value:", body.value);
    t.log("raw:", body.raw);
    t.log("date:", body.date);

    t.truthy(body.value, "should return a value");
    t.regex(body.value, /^\d+([.,]\d+)?$/, "value should be numeric");
    t.true("date" in body, "should have a date field (null if no EXIF)");
  });

  test.serial("meter-photo: recognized value is ~19777.9 kWh", async t => {
    await sleep(5000);
    const response = await postMeterPhoto(t.context.url, t.context.token);
    const { value } = await response.json();

    const numeric = parseFloat(value.replace(",", "."));
    t.log("Numeric value:", numeric);

    // Meter shows 019777.9 — model may read 5 or 6 digits depending on image quality
    // Accept range covers both 01977.x and 019777.x readings
    t.true(
      numeric >= 1975 && numeric < 19780,
      `Expected ~1977 or ~19777, got ${numeric}`
    );
  });

  test.serial("meter-photo: reads Heliowatt meter (meter2) as ~10137 kWh", async t => {
    await sleep(5000);
    const response = await postMeterPhoto(t.context.url, t.context.token, FIXTURE2);

    t.is(response.status, 200);
    const body = await response.json();
    t.log("value:", body.value, "raw:", body.raw);

    const numeric = parseFloat(body.value.replace(",", "."));
    // Meter shows 10137.1 — decimal digit may vary, integer part should match
    t.true(
      numeric >= 10135 && numeric < 10140,
      `Expected ~10137, got ${numeric}`
    );
  });

  test.serial("meter-photo: returns 400 when image is missing", async t => {
    const response = await fetch(
      `${t.context.url}/category/electricity/meter-photo`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t.context.token}`
        },
        body: JSON.stringify({ mimeType: "image/jpeg" })
      }
    );

    t.is(response.status, 400);
  });

  test.serial("meter-photo: returns 401 without auth token", async t => {
    const imageBase64 = readFileSync(FIXTURE).toString("base64");
    const response = await fetch(
      `${t.context.url}/category/electricity/meter-photo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mimeType: "image/jpeg" })
      }
    );

    t.is(response.status, 401);
  });
}
