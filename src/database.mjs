import Master from "@konsumation/db-level";

export const defaultDatabaseConfig = {
  database: {
    file: "${statedir}/db"
  }
};

export async function prepareDatabase(config) {
  const master = await Master.initialize(config.database.file);
  return { master };
}
