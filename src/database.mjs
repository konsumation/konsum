import levelup from "levelup";
import leveldown from "leveldown";
import { Category } from './category';

export async function prepareDatabase(config) {
  return levelup(leveldown(config.database.path));
}


/**
 *
 */
export async function * categories(db) {
  for await ( const data of db.createReadStream( /*{ start: "categories/A", end: "categories/Z" }*/)) {
    console.log(data);
    yield new Category(data.key, data.value);
  }

}

export async function insertCategory(db, category) {
  return db.put("categories/" +category.name, "XXX");
}
