import levelup from "levelup";
import leveldown from "leveldown";

export async function prepareDatabase(config) {
  return levelup(leveldown(config.database.path));
}
