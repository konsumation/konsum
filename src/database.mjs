import levelup from "levelup";
import leveldown from "leveldown";
import { initialize, Category } from "konsum-db";

export const defaultDatabaseConfig = {
  database: {
    file: "${statedir}/db"
  }
};

export async function prepareDatabase(config) {
  const db = await levelup(leveldown(config.database.file));

  const master = await initialize(db);
  console.log("DATABASE", master);

  for await (const c of Category.entries(db)) {
    console.log("CATEGORY", c.name);
    for await (const { time, value } of c.values(db)) {
      console.log(c.name, time, value);
    }
  }

  return db;
}
