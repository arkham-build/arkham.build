import { randomUUID } from "node:crypto";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const runId = process.env.E2E_RUN_ID ?? randomUUID().replaceAll("-", "");

const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3100";
const frontendUrl =
  process.env.E2E_FRONTEND_URL ?? `http://localhost:${frontendPort}`;

const apiPort = process.env.E2E_API_PORT ?? "8788";
const apiUrl = process.env.E2E_API_URL ?? `http://localhost:${apiPort}`;

const dbName = process.env.E2E_DB_NAME ?? `arkham_build_e2e_${runId}`;
const postgresHost = process.env.E2E_POSTGRES_HOST ?? "localhost";
const postgresPort = process.env.E2E_POSTGRES_PORT ?? "5432";
const postgresUser = process.env.E2E_POSTGRES_USER ?? "postgres";
const postgresPassword = process.env.E2E_POSTGRES_PASSWORD ?? "postgres";
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  `postgres://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${dbName}?sslmode=disable`;

process.env.E2E_RUN_ID = runId;
process.env.E2E_DB_NAME = dbName;
process.env.E2E_FRONTEND_URL = frontendUrl;
process.env.E2E_API_URL = apiUrl;
process.env.E2E_DATABASE_URL = databaseUrl;
process.env.VITE_API_URL = apiUrl;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        locale: "en-GB",
      },
    },
  ],
  webServer: {
    command: `${process.execPath} --experimental-strip-types ${path.join(import.meta.dirname, "stack.ts")}`,
    env: {
      ...process.env,
      E2E_API_PORT: apiPort,
      E2E_API_URL: apiUrl,
      E2E_DATABASE_URL: databaseUrl,
      E2E_DB_NAME: dbName,
      E2E_FRONTEND_PORT: frontendPort,
      E2E_FRONTEND_URL: frontendUrl,
      E2E_RUN_ID: runId,
    },
    reuseExistingServer: false,
    timeout: 300000,
    url: frontendUrl,
  },
});
