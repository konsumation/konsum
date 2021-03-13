#!/usr/bin/env node

import swaggerJsdoc from "swagger-jsdoc";
import { readFileSync, writeFileSync } from "fs";
import SwaggerParser from "@apidevtools/swagger-parser";

const encodingOptions = {
  encoding: "utf8"
};

function pn(path) {
  return new URL(path, import.meta.url).pathname;
}

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

writeFileSync(
  fileName,
  JSON.stringify(swaggerJsdoc(options), undefined, 2),
  encodingOptions
);

await SwaggerParser.validate(fileName);
