import levelup from "levelup";
import leveldown from "leveldown";

export function prepareDatabase(config) {
  return levelup(leveldown(config.database.path));
}
