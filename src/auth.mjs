import ldapts from "ldapts";

export const defaultAuthConfig = {
  ldap: {
    url: "ldap://ldap.mf.de",
    bindDN: "uid={{user}},ou=accounts,dc=mf,dc=de",
    entitelments: {
      base: "ou=groups,dc=mf,dc=de",
      attribute: "cn",
      scope: "sub",
      filter:
        "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{user}},ou=accounts,dc=mf,dc=de))"
    }
  },
  users: {
  }
};

export async function authenticate(config, username, password) {
  const entitlements = new Set();

  const ldap = config.ldap;
  if (ldap !== undefined) {
    const client = new ldapts.Client({
      url: ldap.url
    });

    function inject(str) {
      return str.replace(/\{\{user\}\}/, username);
    }

    try {
      console.log("BIND", inject(ldap.bindDN));
      await client.bind(inject(ldap.bindDN), password);

      const { searchEntries } = await client.search(
        inject(ldap.entitelments.base),
        {
          scope: ldap.entitelments.scope,
          filter: inject(ldap.entitelments.filter),
          attributes: [ldap.entitelments.attribute]
        }
      );
      searchEntries.forEach(e =>
        entitlements.add(e[ldap.entitelments.attribute])
      );
    } catch (ex) {
      console.log(ex);
    } finally {
      await client.unbind();
    }
  }

  if (config.users !== undefined) {
    const user = config.users[username];
    if (user !== undefined && user.password === password) {
      user.entitlements.forEach(e => entitlements.add(e));
    }
  }

  return { entitlements };
}
