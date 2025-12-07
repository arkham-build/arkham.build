import assert from "node:assert";
import { test as base } from "vitest";
import { appFactory } from "../app.ts";
import { getDatabase } from "../db/db.ts";
import { configFromEnv } from "../lib/config.ts";

export function getTestDatabase() {
  const container = globalThis.postgresContainer;
  assert(container, "PostgreSQL container not started.");
  return getDatabase(container.getConnectionUri());
}

function getDependencies() {
  const container = globalThis.postgresContainer;
  assert(container, "PostgreSQL container not started.");

  const config = configFromEnv({
    POSTGRES_DB: container.getDatabase(),
    POSTGRES_HOST: container.getHost(),
    POSTGRES_PORT: container.getPort(),
    POSTGRES_USER: container.getUsername(),
    POSTGRES_PASSWORD: container.getPassword(),
  });

  const db = getTestDatabase();
  const app = appFactory(config, db);

  return { app, db };
}

export const test = base.extend<{
  dependencies: ReturnType<typeof getDependencies>;
}>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest expects a destructure here
  dependencies: async ({}, use) => {
    const dependencies = getDependencies();
    await use(dependencies);
    await dependencies.db.destroy();
    await globalThis.postgresContainer?.restoreSnapshot();
  },
});
