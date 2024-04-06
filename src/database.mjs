async function loadDrivers(names) {
  const drivers = {};

  for (const name of names) {
    const driver = await import(name);
    drivers[driver.default.name] = driver.default;
  }

  return drivers;
}

export const defaultDatabaseConfig = {
  database: {
    level: "${statedir}/db"
  }
};

export async function prepareDatabase(config) {
  const dbTypes = await loadDrivers([
    "@konsumation/db-level",
    "@konsumation/db-postgresql"
  ]);

  for (const [driverName, option] of Object.entries(config.database)) {
    return { master: await dbTypes[driverName].initialize(option) };
  }

  return {};
}
