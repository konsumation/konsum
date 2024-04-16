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

  const parameters = definionPerPath.parameters || [];
  const validator = new Validator();

  for (const [method, definition] of Object.entries(definionPerPath)) {
    if (method === "parameters") {
      continue;
    }
    for (const [responseCode, definitionResponse] of Object.entries(
      definition.responses
    )) {
      for (const expected of asArray(allExpected[method] || {})) {
        try {
          const headers = { Authorization: `Bearer ${t.context.token}` };
          const options = { method, headers };
          if (expected?.request?.body) {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(expected.request.body);
          }

          const pathParameters = {};

          for (const parameter of parameters) {
            if (parameter.in === "path") {
              pathParameters[parameter.name] =
                allExpected?.[method]?.parameters?.[parameter.name];
            }
          }

          const url = path.replaceAll(
            /\{(\w+)\}/g,
            (match, a) => pathParameters[a]
          );

          const response = await fetch(`${t.context.url}${url}`, options);

          t.log(
            `${method} ${url} ${options.body || ""} (${responseCode}) ${
              response.status
            }`
          );

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

              switch (definitionContentType) {
                case "application/json":
                  body = JSON.parse(body);

                case "text/plain":
                case "application/text":
                  const validationResult = validator.validate(
                    body,
                    definitionContent.schema
                  );

                  //console.log(validationResult);
                  t.log(validationResult.errors.join(","));

                  t.is(validationResult.errors.length, 0, "validation errors");
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
