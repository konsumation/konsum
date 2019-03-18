
import levelup from "levelup";
import leveldown from "leveldown";
import { initialize } from "konsum-db";

export async function prepareDatabase(config) {
  const db = await levelup(leveldown(config.database.path));

  const master = await initialize(db);
  console.log("DATABASE", master);
  return db;
}

