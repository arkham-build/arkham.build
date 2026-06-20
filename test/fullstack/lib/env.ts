import { randomUUID } from "node:crypto";

export const runId = process.env.E2E_RUN_ID ?? randomUUID().replaceAll("-", "");

export const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3100";
export const frontendUrl =
  process.env.E2E_FRONTEND_URL ?? `http://localhost:${frontendPort}`;

export const apiPort = process.env.E2E_API_PORT ?? "8788";
export const apiUrl = process.env.E2E_API_URL ?? `http://localhost:${apiPort}`;

export const dbName = process.env.E2E_DB_NAME ?? `arkham_build_e2e_${runId}`;
export const postgresHost = process.env.E2E_POSTGRES_HOST ?? "localhost";
export const postgresPort = process.env.E2E_POSTGRES_PORT ?? "5432";
export const postgresUser = process.env.E2E_POSTGRES_USER ?? "postgres";
export const postgresPassword = process.env.E2E_POSTGRES_PASSWORD ?? "postgres";
export const postgresAdminDb = process.env.E2E_POSTGRES_ADMIN_DB ?? "postgres";
export const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  `postgres://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${dbName}?sslmode=disable`;

export const mailcrabUrl =
  process.env.E2E_MAILCRAB_URL ?? "http://localhost:1080";

export const arkhamDbBaseUrl =
  process.env.E2E_ARKHAMDB_BASE_URL ?? "http://localhost:8000";
export const arkhamDbTestApiKey =
  process.env.E2E_ARKHAMDB_TEST_API_KEY ?? "test-arkhamdb-api-key";

export const sessionCookieName =
  process.env.E2E_SESSION_COOKIE_NAME ?? "arkham-build-session";

export function applyFullstackEnv() {
  Object.assign(process.env, createFullstackEnv());
}

export function createStackEnv(overrides: Record<string, string> = {}) {
  return {
    ...process.env,
    ...createFullstackEnv(),
    ADMIN_API_KEY: "test-admin-api-key",
    ARKHAMDB_BASE_URL: arkhamDbBaseUrl,
    ARKHAMDB_OAUTH_CLIENT_ID: "test-client-id",
    ARKHAMDB_OAUTH_CLIENT_SECRET: "test-client-secret",
    ARKHAMDB_OAUTH_REDIRECT_URI: `${apiUrl}/auth/arkhamdb/callback`,
    CORS_ORIGINS: frontendUrl,
    DATABASE_URL: databaseUrl,
    DBMATE_MIGRATIONS_DIR: "src/db/migrations",
    ENABLE_JOB_SCHEDULES: "false",
    FROM_EMAIL: "noreply@arkham-build.local",
    FRONTEND_URL: frontendUrl,
    LEGACY_API_BASE_URL: apiUrl,
    INGEST_JSON_DATA_REPO: "Kamalisk/arkhamdb-json-data@master",
    INGEST_METADATA_REPO: "arkham-build/arkhamlcg-metadata@main",
    INGEST_TABOO_DATA_REPO: "fspoettel/arkham-cards-data@master",
    INGEST_URL_ARKHAMDB_DECKLISTS: "http://example.com/decklists",
    METADATA_LOCALES: "en",
    NODE_ENV: "test",
    PORT: apiPort,
    POSTGRES_DB: dbName,
    POSTGRES_HOST: postgresHost,
    POSTGRES_PASSWORD: postgresPassword,
    POSTGRES_PORT: postgresPort,
    POSTGRES_USER: postgresUser,
    SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
    SMTP_HOST: new URL(mailcrabUrl).hostname,
    SMTP_PASS: "",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    SMTP_USER: "",
    VITE_API_LEGACY_URL: apiUrl,
    VITE_API_URL: apiUrl,
    VITE_ADMIN_EMAIL: "info@example.com",
    VITE_LEGAL_NOTICE: "Example legal notice\\nEmail: info@example.com",
    VITE_ARKHAMDB_BASE_URL: arkhamDbBaseUrl,
    VITE_CARD_IMAGE_URL: "https://assets.arkham.build",
    VITE_PAGE_NAME: "arkham.build",
    VITE_SHOW_PREVIEW_BANNER: "false",
    VITE_TURNSTILE_SITE_KEY: "",
    ...overrides,
  };
}

function createFullstackEnv() {
  return {
    E2E_API_PORT: apiPort,
    E2E_ARKHAMDB_BASE_URL: arkhamDbBaseUrl,
    E2E_ARKHAMDB_TEST_API_KEY: arkhamDbTestApiKey,
    E2E_API_URL: apiUrl,
    E2E_DATABASE_URL: databaseUrl,
    E2E_DB_NAME: dbName,
    E2E_FRONTEND_PORT: frontendPort,
    E2E_FRONTEND_URL: frontendUrl,
    E2E_MAILCRAB_URL: mailcrabUrl,
    E2E_POSTGRES_ADMIN_DB: postgresAdminDb,
    E2E_POSTGRES_HOST: postgresHost,
    E2E_POSTGRES_PASSWORD: postgresPassword,
    E2E_POSTGRES_PORT: postgresPort,
    E2E_POSTGRES_USER: postgresUser,
    E2E_RUN_ID: runId,
    VITE_ADMIN_EMAIL: "info@example.com",
    VITE_LEGAL_NOTICE: "Example legal notice\\nEmail: info@example.com",
    VITE_API_URL: apiUrl,
  };
}
