import levelup from "levelup";
import leveldown from "leveldown";
import { initialize } from "konsum-db";

export const defaultDatabaseConfig = {
  database: {
    file: "${statedir}/db"
  }
};

export async function prepareDatabase(config) {
  const database = await levelup(leveldown(config.database.file));
  const meta = await initialize(database);

  return { database, meta };
}
