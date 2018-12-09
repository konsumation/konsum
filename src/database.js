import level from 'level';

export function prepareDatabase(config) {
  return level(config.database.file);
}

