const CATEGORY_PREFIX = "categories.";

/**
 * @param {string} name category name
 * @param {string} unit physical unit
 *
 * @property {string} name category name
 * @property {string} unit physical unit
 */
export class Category {
  constructor(name, unit) {
    Object.defineProperties(this, {
      name: { value: name },
      unit: { value: unit }
    });
  }

  toString() {
    return `${this.name}: ${this.unit}`;
  }

  toJSON() {
    return {
      name: this.name,
      unit: this.unit
    };
  }

  /**
   *
   */
  static async *entries(db) {
    for await (const data of db.createReadStream(/*{ start: "categories/A", end: "categories/Z" }*/)) {
      //console.log(data.key.toString());
      const name = data.key.toString().substring(CATEGORY_PREFIX.length);
      //console.log(name);

      yield new Category(name, data.value.toString());
    }
  }

  async write(db) {
    const key = CATEGORY_PREFIX + this.name;
    //console.log("write", key);

    return db.put(key, this.unit);
  }
}
