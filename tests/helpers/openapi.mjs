import { readFile } from "fs/promises";
import got from "got";
import SwaggerParser from "@apidevtools/swagger-parser";

export async function loadOpenAPI(t, path)
{
  //t.context.api = await SwaggerParser.validate(path);

  t.context.api = JSON.parse( await readFile(path, { encoding: "utf8" }));
}

async function assertResponse(t, response, erc, er, expected) {
  for (const [ct, c] of Object.entries(er.content)) {
    switch (ct) {
      case "application/json":
        const body = JSON.parse(response.body);
        t.like(body, expected[erc]);
        break;
      case "application/text":
        t.is(response.body, expected[erc]);
        break;

      default:
        t.log(`Unknown content type ${ct}`);
    }
  }
}

export async function assertOpenapiPath(t, path, expected) {
  const p = t.context.api.paths[path];
  t.truthy(p, `Does not exists in api: ${path}`);

  const headers = { Authorization: `Bearer ${t.context.token}` };

  for (const [emn, em] of Object.entries(p)) {
    switch (emn) {
      case "get":
        for (const [erc, er] of Object.entries(em.responses)) {
          try {
            const response = await got.get(`${t.context.url}${path}`, {
              headers
            });
            await assertResponse(t, response, erc, er, expected);

            t.is(response.statusCode, parseInt(erc), "${path}");
          } catch (e) {
        //    await assertResponse(t, e.response, erc, er, expected);

            const response = e.response;
            t.deepEqual(response.body, expected[response.statusCode]);
            
          }
        }
        break;
      case "put":
        try {
          const response = await got.put(`${t.context.url}${path}`, {
            headers
          });
        } catch (e) {
          const response = e.response;
          t.deepEqual(response.body, expected[response.statusCode]);
        }
        break;
      case "post":
        try {
          const response = await got.post(`${t.context.url}${path}`, {
            headers
          });
        } catch (e) {
          const response = e.response;
          t.deepEqual(response.body, expected[response.statusCode]);
        }
        break;
      case "delete":
        try {
          const response = await got.delete(`${t.context.url}${path}`, {
            headers
          });
        } catch (e) {
          const response = e.response;
          t.deepEqual(response.body, expected[response.statusCode]);
        }
        break;

      case "parameters":
        break;
      default:
        t.log(`Unknown method ${emn}`);
    }
  }
}

export async function openapiPathTest(t, path, expected) {
  await assertOpenapiPath(t, path, expected);
}

openapiPathTest.title = (providedTitle = "openapi", path, expected) =>
  `${providedTitle} ${path}`.trim();
