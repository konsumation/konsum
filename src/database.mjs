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

  return db;
}
