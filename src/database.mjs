export const defaultDatabaseConfig = {
  database: {
    "@konsumation/db-level": "${statedir}/db"
  }
};

export async function prepareDatabase(config, sd) {
  for (const [name, option] of Object.entries(config.database)) {
    return { master: await (await import(name)).default.initialize(option) };
  }

  return {};
}
