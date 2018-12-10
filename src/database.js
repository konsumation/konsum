const level = require ('level');

export function prepareDatabase(config) {
  return level(config.database.file);
}

