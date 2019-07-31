import ldapts from "ldapts";

export const defaultAuthConfig = {
  ldap: {
    url: "ldap://ldap.mf.de",
    bindDN: "uid={{user}},ou=accounts,dc=mf,dc=de",
    roles: {
      base: "ou=groups,dc=mf,dc=de",
      filter: "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{user}},ou=accounts,dc=mf,dc=de))"
    }
  },
  users: {
    nobody : { }
  }
};


export async function authenticate(config,username,password)
{
    const entitlements = new Set();

    if (config.ldap !== undefined) {
      const client = new ldapts.Client({
        url: config.ldap.url
      });

      function inject(str)
      {
        return str.replace(/\{\{user\}\}/, username);
      }

      try {
        await client.bind(inject(config.ldap.bindDN), password);

        const {
          searchEntries,
          searchReferences,
        } = await client.search(inject(config.ldap.roles.base), {
          scope: 'sub',
          filter: inject(config.ldap.roles.filter)
        });
        console.log(searchEntries);
        console.log(searchReferences);
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
