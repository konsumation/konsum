const CATEGORY_PREFIX = "categories.";

/**
 * @param {string} name category name
 * @param {object} options physical unit
 *
 * @property {string} name category name
 * @property {string} unit physical unit
 */
export class Category {
  constructor(name, options) {
    Object.defineProperties(this, {
      name: { value: name },
      unit: { value: options.unit }
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

      yield new Category(name, JSON.parse(data.value.toString()));
    }
  }

  async write(db) {
    const key = CATEGORY_PREFIX + this.name;
    return db.put(key, JSON.stringify({ unit: this.unit }));
  }
}
