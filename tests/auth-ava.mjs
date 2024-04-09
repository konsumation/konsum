import test from "ava";
import { Socket } from "node:net";
import { authenticate } from "../src/auth.mjs";

const ldapPort = 389;

async function authConfig(t) {
  const localConfig = {
    auth: {
      ldap: {
        url: `ldap://localhost:${ldapPort}`,
        bindDN: "uid={{username}},ou=accounts,dc=example,dc=com",
        entitlements: {
          base: "ou=groups,dc=example,dc=com",
          attribute: "cn",
          scope: "sub",
          filter:
            "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{username}},ou=accounts,dc=example,dc=com))"
        }
      }
    }
  };

  const config2 = {
    auth: {
      ldap: {
        url: "ldaps://mfelten.dynv6.net",
        bindDN: "uid={{username}},ou=accounts,dc=mf,dc=de",
        entitlements: {
          base: "ou=groups,dc=mf,dc=de",
          attribute: "cn",
          scope: "sub",
          filter:
            "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{username}},ou=accounts,dc=mf,dc=de))"
        }
      }
    }
  };

  let config = config2;

  const socket = new Socket();

  socket.on("error", error => {
    t.log(error);
  });

  socket.connect(ldapPort, () => {
    t.log("connected to localhost");
    config = localConfig;
  });

  const p = new Promise((resolve, reject) => {
    t.log("wait for connect...");
    setTimeout(() => resolve(), 3000);
  });

  await p;

  return config;
}

test.skip("ldap auth", async t => {
  const config = await authConfig(t);
  let result = await authenticate(config, "user1", "test");

  t.deepEqual(result.entitlements, new Set(["konsum"]));
});

test.skip("ldap auth unknown user", async t => {
  const config = await authConfig(t);

  await t.throwsAsync(
    async () => {
      await authenticate(config, "user77", "test");
    } /*, "Invalid credentials during a bind operation. Code: 0x31"*/
  );

  // t.deepEqual(result.entitlements, new Set());
});

test("embedded user", async t => {
  const { entitlements } = await authenticate(
    {
      auth: {
        users: {
          herbert: {
            password: "secret",
            entitlements: ["konsum"]
          }
        }
      }
    },
    "herbert",
    "secret"
  );

  t.deepEqual(entitlements, new Set(["konsum"]));
});
