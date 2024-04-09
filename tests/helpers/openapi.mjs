import got from "got";
import SwaggerParser from "@apidevtools/swagger-parser";

export async function loadOpenAPI(t, path) {
  t.context.api = await SwaggerParser.validate(path);
}

async function assertResponse(t, response, erc, methodName, er, expected) {
  if (expected?.response) {
    expected = expected.response;
  }

  if (er?.content) {
    for (const [ct, c] of Object.entries(er.content)) {
      switch (ct) {
        case "application/json":
          const body = JSON.parse(response.body);
          if (Array.isArray(body)) {
            t.deepEqual(body, expected[erc], `${erc} ${methodName}`);
          } else {
            t.like(body, expected[erc], `${erc} ${methodName}`);
          }
          break;

        case "text/plain":
        case "application/text":
          t.is(response.body, expected[erc], methodName);
          break;

        default:
          t.log(`Unknown content type ${ct} ${methodName}`);
      }
    }
  } else {
    switch (erc) {
      case 403:
        break;

      default:
        t.log("Unknown response " + erc);
    }
  }
}

export async function assertOpenapiPath(t, path, expected) {
  const p = t.context.api.paths[path];
  t.truthy(p, `Does not exists in api: ${path}`);

  const headers = { Authorization: `Bearer ${t.context.token}` };

  for (const [methodName, em] of Object.entries(p)) {
    async function handleError(e, methodName) {
      if (e.response) {
        const statusCode = e.response.statusCode;
        await assertResponse(
          t,
          e.response,
          statusCode,
          methodName,
          em.responses[statusCode],
          expected.response ? expected.response : expected
        );
      } else {
        t.log(`No response from ${methodName} ${path}`, e);
      }
    }

    switch (methodName) {
      case "get":
        //    for (const [erc, er] of Object.entries(em.responses)) {
        try {
          const response = await got.get(`${t.context.url}${path}`, {
            headers
          });

          const er = em.responses[response.statusCode];

          t.truthy(
            er,
            `unexpected status code ${response.statusCode} ${methodName} ${path}`
          );

          await assertResponse(
            t,
            response,
            response.statusCode,
            methodName,
            er,
            expected
          );
        } catch (e) {
          await handleError(e, methodName);
        }
        //  }
        break;
      case "put":
        try {
          const response = await got.put(`${t.context.url}${path}`, {
            headers,
            json: expected.put
          });
        } catch (e) {
          await handleError(e, methodName);
        }
        break;
      case "post":
        for (const [erc, er] of Object.entries(em.responses)) {
          try {
            const response = await got.post(`${t.context.url}${path}`, {
              headers,
              json: expected.post
            });

            await assertResponse(t, response, erc, methodName, er, expected);
          } catch (e) {
            await handleError(e, methodName);
          }
        }
        break;
      case "delete":
        try {
          const response = await got.delete(`${t.context.url}${path}`, {
            headers
          });
        } catch (e) {
          await handleError(e, methodName);
        }
        break;

      case "parameters":
        break;
      default:
        t.log(`Unknown method ${methodName}`);
    }
  }
}

export async function openapiPathTest(t, path, expected) {
  await assertOpenapiPath(t, path, expected);
}

openapiPathTest.title = (providedTitle = "openapi", path, expected) =>
  `${providedTitle} ${path} ${Object.keys(expected)}`.trim();
