import test from "ava";

import { authenticate } from "../src/auth.mjs";

const config = {
  ldap: {
    url: "ldap://localhost:3389",
    bindDN: "uid={{user}},ou=accounts,dc=mf,dc=de",
    roles: {
      base: "ou=groups,dc=mf,dc=de",
      filter:
        "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{user}},ou=accounts,dc=mf,dc=de))"
    }
  }
};

test("ldap auth", async t => {
  const { entitlements } = await authenticate(config, "herbert", "test");

  t.deepEqual(entitlements, new Set());
});

test("embedded user", async t => {
  const { entitlements } = await authenticate(
    {
      users: {
        herbert: {
          password: "secret",
          entitlements: ["konsum"]
        }
      }
    },
    "herbert",
    "secret"
  );

  t.deepEqual(entitlements, new Set(["konsum"]));
});
