import test from "ava";
import { Socket } from "net";

import { authenticate } from "../src/auth.mjs";

const localConfig = {
  ldap: {
    url: "ldap://localhost:3389",
    bindDN: "uid={{user}},ou=accounts,dc=example,dc=com",
    entitelments: {
      base: "ou=groups,dc=example,dc=com",
      attribute: "cn",
      scope: "sub",
      filter:
        "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{user}},ou=accounts,dc=example,dc=com))"
    }
  }
};

const config2 = {
  ldap: {
    url: "ldaps://mfelten.dynv6.net",
    bindDN: "uid={{user}},ou=accounts,dc=mf,dc=de",
    entitelments: {
      base: "ou=groups,dc=mf,dc=de",
      attribute: "cn",
      scope: "sub",
      filter:
        "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{user}},ou=accounts,dc=mf,dc=de))"
    }
  }
};

test.only("ldap auth", async t => {
  let config = config2;

  const socket = new Socket();

  socket.on("error", error => {
    t.log(error);
  });

  socket.connect(3389, () => {
    t.log("connected to localhost");
    config = localConfig;
  });

  const p = new Promise((resolve, reject) => {
    t.log("wait for connect...");
    setTimeout(() => resolve(), 3000);
  });

  await p;

  const { entitlements } = await authenticate(config, "user1", "test");

  t.deepEqual(entitlements, new Set(["konsum"]));
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
