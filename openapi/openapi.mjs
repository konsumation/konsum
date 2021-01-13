import swaggerJsdoc from "swagger-jsdoc";
import { readFileSync, writeFileSync } from "fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url).pathname, {
    encoding: "utf8"
  })
);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: pkg.description,
      version: pkg.version
    }
  },
  apis: [new URL("../src/*.mjs", import.meta.url).pathname]
};

writeFileSync(
  new URL("../openapi/openapi.json", import.meta.url).pathname,
  JSON.stringify(swaggerJsdoc(options), undefined, 2),
  {
    encoding: "utf8"
  }
);
