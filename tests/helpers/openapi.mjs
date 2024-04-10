import SwaggerParser from "@apidevtools/swagger-parser";
import { Validator } from "jsonschema";
import { streamToString } from "browser-stream-util";

export async function loadOpenAPI(t, path) {
  t.context.api = await SwaggerParser.validate(path);
}

export function asArray(value) {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export async function assertOpenapiPath(t, path, allExpected) {
  const definionPerPath = t.context.api.paths[path];
  t.truthy(definionPerPath, `Does not exists in api: ${path}`);

  const validator = new Validator();

  for (const [method, definition] of Object.entries(definionPerPath)) {
    for (const [responseCode, definitionResponse] of Object.entries(
      definition.responses
    )) {
      for (const expected of asArray(allExpected[method] || {})) {
        // console.log("AE", method, responseCode, definitionResponse, expected);
        try {
          const headers = { Authorization: `Bearer ${t.context.token}` };
          const options = { method, headers };
          if (expected.data) {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(expected.data);
          }

          t.log(`${method} ${path} (${responseCode})`);

          const response = await fetch(`${t.context.url}${path}`, options);
          const definitionResponse = definition.responses[response.status];

          t.truthy(
            definitionResponse,
            `Unexpected status code ${response.status} ${method} ${path}`
          );

          let body = response.body ? await streamToString(response.body) : "";

          if (definitionResponse?.content) {
            for (const [
              definitionContentType,
              definitionContent
            ] of Object.entries(definitionResponse.content)) {
              const e = expected[responseCode];
              // console.log(body, e, definitionContent);

              switch (definitionContentType) {
                case "application/json":
                  body = JSON.parse(body);

                case "text/plain":
                case "application/text":
                  const validationResult = validator.validate(
                    body,
                    definitionContent.schema
                  );

                  t.true(
                    validationResult.errors.length === 0,
                    "validation errors"
                  );

                  //t.is(body, e, `${responseCode} ${method}`);
                  break;

                default:
                  t.log(
                    `Unknown content type ${definitionContentType} ${method}`
                  );
              }
            }
          }
        } catch (e) {
          t.log(`Error from ${method} ${path}`, e);
        }
      }
    }
  }
}

export async function openapiPathTest(t, path, expected) {
  await assertOpenapiPath(t, path, expected);
}

openapiPathTest.title = (providedTitle = "openapi", path, expected) =>
  `${providedTitle} ${path} ${Object.keys(expected)}`.trim();
