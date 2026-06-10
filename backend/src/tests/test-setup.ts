import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { applySqlFiles } from "../db/db.helpers.ts";
import { getTestDatabase, seedTestAccount } from "./test-utils.ts";

beforeAll(async () => {
  const container = new PostgreSqlContainer("postgres:18-alpine");
  globalThis.postgresContainer = await container.start();
  const database = getTestDatabase();

  await database.transaction().execute(async (tx) => {
    await applySqlFiles(tx, "../db/migrations");
    await applySqlFiles(tx, "../tests/seeds");
    await seedTestAccount(tx);
  });

  await database.destroy();
  await globalThis.postgresContainer.snapshot();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

afterAll(async () => {
  await globalThis.postgresContainer?.stop();
  globalThis.postgresContainer = undefined;
});

declare global {
  var postgresContainer: StartedPostgreSqlContainer | undefined;
}
