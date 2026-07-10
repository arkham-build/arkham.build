import assert from "node:assert";
import type { Kysely } from "kysely";
import { test as base } from "vitest";
import { appFactory } from "../app.ts";
import { type Database, getDatabase } from "../db/db.ts";
import type { DB } from "../db/schema.types.ts";
import { hashPassword } from "../features/auth/lib/crypto.ts";
import type { EnqueueOptions, JobDispatcher } from "../jobs/dispatcher.ts";
import type { DeliverEmailJobData } from "../jobs/job-types.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { type Config, configFromEnv } from "../lib/config.ts";
import { MockMailer } from "./mocks/email.ts";

export const TEST_ACCOUNT = {
  email: "test-account@example.com",
  name: "test-account",
  password: "SecurePassword123!",
};

export async function seedTestAccount(tx: Kysely<DB>) {
  const account = await tx
    .insertInto("account")
    .values({ name: TEST_ACCOUNT.name })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  await tx
    .insertInto("account_identity")
    .values({
      account_id: account.id,
      email: TEST_ACCOUNT.email,
      password_hash: await hashPassword(TEST_ACCOUNT.password),
      provider: "email",
      provider_user_id: TEST_ACCOUNT.email,
      verified_at: new Date(),
    })
    .executeTakeFirstOrThrow();
}

export function getTestDatabase() {
  const container = globalThis.postgresContainer;
  assert(container, "PostgreSQL container not started.");
  return getDatabase(container.getConnectionUri());
}

export async function createAuthenticatedSessionCookie(
  db: Database,
  config: Config,
) {
  const account = await db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirst();

  assert(account, "Seeded test account not found.");

  const session = await createSession(
    db,
    account.id,
    config.SESSION_EXPIRY_HOURS,
  );
  return `${config.SESSION_COOKIE_NAME}=${session.token}`;
}

class TestJobDispatcher implements JobDispatcher {
  private readonly mailer: MockMailer;

  constructor(mailer: MockMailer) {
    this.mailer = mailer;
  }

  enqueueEmail(data: DeliverEmailJobData, _options?: EnqueueOptions) {
    return this.mailer.send(data.to, data.subject, data.text);
  }

  async enqueueIngestArkhamDbDecklists() {}
  async enqueueIngestJsonData() {}
  async enqueuePurgeCloudflareCache() {}
}

async function getDependencies() {
  const container = globalThis.postgresContainer;
  assert(container, "PostgreSQL container not started.");

  const config = configFromEnv({
    ARKHAMDB_BASE_URL: "https://arkhamdb.com",
    ARKHAMDB_OAUTH_CLIENT_ID: "test-client-id",
    ARKHAMDB_OAUTH_CLIENT_SECRET: "test-client-secret",
    ARKHAMDB_OAUTH_REDIRECT_URI: "http://localhost:3001/auth/callback",
    FRONTEND_URL: "http://localhost:3000",
    LEGACY_API_BASE_URL: "http://localhost:8787",
    POSTGRES_DB: container.getDatabase(),
    POSTGRES_HOST: container.getHost(),
    POSTGRES_PASSWORD: container.getPassword(),
    POSTGRES_PORT: container.getPort(),
    POSTGRES_USER: container.getUsername(),
    FROM_EMAIL: "test@example.com",
    SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
    SMTP_HOST: "localhost",
    SMTP_PORT: 1025,
    SMTP_USER: "",
    SMTP_PASS: "",
  });

  const db = getTestDatabase();

  const mailer = new MockMailer();
  const dispatcher = new TestJobDispatcher(mailer);
  const app = appFactory(config, db, dispatcher);

  const sessionCookie = await createAuthenticatedSessionCookie(db, config);
  return { app, config, db, dispatcher, mailer, sessionCookie };
}

export const test = base.extend<{
  dependencies: Awaited<ReturnType<typeof getDependencies>>;
}>({
  // oxlint-disable-next-line no-empty-pattern -- vitest expects a destructure here
  dependencies: async ({}, use) => {
    const dependencies = await getDependencies();
    await use(dependencies);
    await dependencies.db.destroy();
    await globalThis.postgresContainer?.restoreSnapshot();
  },
});
