#!/usr/bin/env node

import swaggerJsdoc from "swagger-jsdoc";
import { readFileSync, writeFileSync } from "fs";
import SwaggerParser from "@apidevtools/swagger-parser";
import { fileURLToPath } from "url";
import utils from "koa-better-router/utils";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

const encodingOptions = {
  encoding: "utf8"
};

const pkg = JSON.parse(readFileSync(pn("../package.json"), encodingOptions));

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: pkg.description,
      version: pkg.version
    }
  },
  apis: [pn("../src/*.mjs")]
};

const fileName = pn("../openapi/openapi.json");

const swagger = swaggerJsdoc(options);
delete swagger.channels;

writeFileSync(
  fileName,
  JSON.stringify(swagger, undefined, 2),
  encodingOptions
);

try {
  await SwaggerParser.validate(fileName);
} catch (err) {
  console.error(err);
}
