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
  process.env.VISION_API_KEY ?? process.env.GOOGLE_AI_STUDIO_API_KEY ?? "";

const FIXTURE = pn("./fixtures/meter.jpg");

const VISION_CONFIG = {
  apiKey: API_KEY,
  apiEndpoint: "https://generativelanguage.googleapis.com/v1beta",
  model: "gemini-2.0-flash",
  prompt:
    "Read the meter display in this image and return only the numeric value with decimal point. No units, no text, just the number.",
  maxOutputTokens: 64,
  temperature: 0
};

if (!API_KEY) {
  test("meter-photo: no API key configured — skipping", t => t.pass());
} else {
  test.before(async t => {
    const port = await getPort();
    const databaseFile = pn(`../build/db-meter-photo-${port}`);

    const config = await createConfig(t.context, port, undefined, {
      "@konsumation/db-level": databaseFile
    });

    // Inject meterPhoto config — endpoint activates automatically when apiKey is set
    config.meterPhoto = { vision: VISION_CONFIG };

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

  async function postMeterPhoto(url, token) {
    const imageBase64 = readFileSync(FIXTURE).toString("base64");
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
    const response = await postMeterPhoto(t.context.url, t.context.token);
    const { value } = await response.json();

    const numeric = parseFloat(value.replace(",", "."));
    t.log("Numeric value:", numeric);

    // Meter shows 019777.9, allow ±2 tolerance for last digit uncertainty
    t.true(
      numeric >= 19775 && numeric < 19780,
      `Expected ~19777.9, got ${numeric}`
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
