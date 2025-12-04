import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll } from "vitest";
import { applySqlFiles } from "../db/db.helpers.ts";
import { getTestDatabase } from "./test-utils.ts";

beforeAll(async () => {
  const container = new PostgreSqlContainer("postgres:16-alpine");
  globalThis.postgresContainer = await container.start();
  const database = getTestDatabase();
  await database.transaction().execute(async (tx) => {
    await applySqlFiles(tx, "../db/migrations");
    await applySqlFiles(tx, "../db/seeds");
    await applySqlFiles(tx, "../tests/seeds");
  });

  await database.destroy();
  await globalThis.postgresContainer.snapshot();
});

afterAll(async () => {
  await globalThis.postgresContainer?.stop();
  globalThis.postgresContainer = undefined;
});

declare global {
  var postgresContainer: StartedPostgreSqlContainer | undefined;
}
