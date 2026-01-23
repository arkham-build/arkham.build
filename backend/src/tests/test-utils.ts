import assert from "node:assert";
import { test as base } from "vitest";
import { appFactory } from "../app.ts";
import { getDatabase } from "../db/db.ts";
import { configFromEnv } from "../lib/config.ts";
import { createEmailService } from "../lib/email/email-service.ts";
import { MockMailer } from "./mocks/email.ts";

export function getTestDatabase() {
  const container = globalThis.postgresContainer;
  assert(container, "PostgreSQL container not started.");
  return getDatabase(container.getConnectionUri());
}

function getDependencies() {
  const container = globalThis.postgresContainer;
  assert(container, "PostgreSQL container not started.");

  const config = configFromEnv({
    FRONTEND_URL: "http://localhost:3000",
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

  const emailService = createEmailService(new MockMailer());
  const app = appFactory(config, db, emailService);

  return { app, db, emailService };
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
