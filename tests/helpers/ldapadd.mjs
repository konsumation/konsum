import { Client } from "ldapts";
import ldif from "ldif";

async function importLDIF(file, options) {
  const data = ldif.parseFile(file);

  const client = new Client(options);

  console.log(options);

  await client.bind(options.bindDN, options.password);

  while (true) {
    const record = data.shift();
    if (!record) {
      break;
    }
    console.log(record.toObject());

    const entry = record.toObject();

    try {
      await client.add(entry.dn, entry.attributes);
    } catch (err) {
      console.error(err);
    }
  }

  await client.unbind();
}

/*
 2  3               4 5                            6  7     8 9
 -h localhost:3389 -D cn=Manager,dc=example,dc=com -w test -f file
*/

const options = {
  url: `ldap://${process.argv[3]}`,
  password: process.argv[7],
  bindDN: process.argv[5]
};

const file = process.argv[9];

importLDIF(file, options);
