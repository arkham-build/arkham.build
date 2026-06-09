import { type ChildProcess, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { PgBoss } from "pg-boss";
import { EMAIL_DELIVER_QUEUE } from "../../backend/src/jobs/job-types.ts";

type MailCrabMessage = {
  id: string;
  subject: string;
  to: Array<{
    email: string;
  }>;
};

type State = {
  createdDatabase: boolean;
  children: ChildProcess[];
  shuttingDown: boolean;
};

const mailcrabUrl = process.env.E2E_MAILCRAB_URL ?? "http://localhost:1080";

const apiPort = process.env.E2E_API_PORT ?? "8788";
const apiUrl = process.env.E2E_API_URL ?? `http://localhost:${apiPort}`;

const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3100";
const frontendUrl =
  process.env.E2E_FRONTEND_URL ?? `http://localhost:${frontendPort}`;

const dbName = process.env.E2E_DB_NAME ?? "arkham_build_e2e";
const postgresHost = process.env.E2E_POSTGRES_HOST ?? "localhost";
const postgresPort = process.env.E2E_POSTGRES_PORT ?? "5432";
const postgresUser = process.env.E2E_POSTGRES_USER ?? "postgres";
const postgresPassword = process.env.E2E_POSTGRES_PASSWORD ?? "postgres";
const postgresAdminDb = process.env.E2E_POSTGRES_ADMIN_DB ?? "postgres";
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  `postgres://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${dbName}?sslmode=disable`;

const runId = process.env.E2E_RUN_ID ?? dbName;

const rootDir = path.resolve(import.meta.dirname, "../..");
const state: State = {
  createdDatabase: false,
  children: [],
  shuttingDown: false,
};

const schemaPath = path.join(rootDir, "backend/src/db/schema.sql");
const vitePath = path.join(rootDir, "node_modules/vite/bin/vite.js");

const childEnv = createChildEnv();

process.once("SIGINT", () => {
  void shutdown(0);
});

process.once("SIGTERM", () => {
  void shutdown(0);
});

await main().catch(async (error) => {
  console.error(error);
  await shutdown(1);
});

async function main() {
  await createDatabase();
  state.createdDatabase = true;

  await runCommand(
    process.execPath,
    [vitePath, "build"],
    path.join(rootDir, "frontend"),
  );

  startProcess("worker", process.execPath, [
    "--experimental-strip-types",
    "backend/src/worker.ts",
  ]);
  await waitForWorkerReady();

  startProcess("api", process.execPath, [
    "--experimental-strip-types",
    "backend/src/main.ts",
  ]);
  await waitForApiReady();

  startProcess(
    "frontend",
    process.execPath,
    [vitePath, "preview", "--host", "127.0.0.1", "--port", frontendPort],
    path.join(rootDir, "frontend"),
  );
  await waitForUrl(frontendUrl, (response) => response.ok);
}

async function shutdown(code: number) {
  if (state.shuttingDown) return;

  state.shuttingDown = true;

  for (const child of state.children) {
    child.kill("SIGTERM");
  }

  await Promise.all(state.children.map(waitForExit));

  if (state.createdDatabase) {
    await dropDatabase();
  }

  process.exit(code);
}

function startProcess(
  name: string,
  command: string,
  args: string[],
  cwd = rootDir,
) {
  const child = spawn(command, args, {
    cwd,
    env: childEnv,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (state.shuttingDown) return;

    console.error(
      `${name} exited unexpectedly with code ${String(code)} and signal ${String(signal)}`,
    );

    void shutdown(1);
  });

  child.on("error", (error) => {
    if (state.shuttingDown) return;

    console.error(error);
    void shutdown(1);
  });

  state.children.push(child);
  return child;
}

async function runCommand(command: string, args: string[], cwd = rootDir) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: childEnv,
      stdio: "inherit",
    });

    child.once("error", reject);

    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${String(code)}`,
        ),
      );
    });
  });
}

async function createDatabase() {
  const client = await getAdminClient();

  try {
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)}`);
    await client.query(`CREATE DATABASE ${quoteIdentifier(dbName)}`);
  } finally {
    await client.end();
  }

  await applySchema();
}

async function applySchema() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  const schema = sanitizeSql(await readFile(schemaPath, "utf8"));
  await client.connect();

  try {
    await client.query(schema);
  } finally {
    await client.end();
  }
}

async function dropDatabase() {
  const client = await getAdminClient();

  try {
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [dbName],
    );

    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)}`);
  } finally {
    await client.end();
  }
}

async function waitForApiReady() {
  await waitForUrl(`${apiUrl}/v2/auth/me`, (response) => response.status < 500);
}

async function waitForWorkerReady() {
  const to = `worker-ready-${runId}@example.com`;
  const subject = `worker-ready-${runId}`;
  const text = `worker-ready-${runId}`;
  const boss = new PgBoss({
    connectionString: databaseUrl,
    schema: "pgboss",
  });

  await boss.start();

  try {
    await waitForCondition(async () => {
      try {
        const jobId = await boss.send(EMAIL_DELIVER_QUEUE, {
          subject,
          text,
          to,
        });
        return !!jobId;
      } catch {
        return false;
      }
    });

    await waitForCondition(async () => {
      const messages = await fetchJson<Array<MailCrabMessage>>(
        `${mailcrabUrl}/api/messages`,
      );
      const message = messages.find(
        (item) =>
          item.subject === subject &&
          item.to.some((recipient) => recipient.email === to),
      );

      if (!message) {
        return false;
      }

      const detail = await fetchJson<{ text: string }>(
        `${mailcrabUrl}/api/message/${message.id}`,
      );
      return detail.text.includes(text);
    }, 120000);
  } finally {
    await boss.stop();
  }
}

async function waitForUrl(
  url: string,
  predicate: (response: Response) => boolean,
) {
  await waitForCondition(async () => {
    try {
      const response = await fetch(url, {
        redirect: "manual",
      });
      return predicate(response);
    } catch {
      return false;
    }
  });
}

async function waitForCondition(
  predicate: () => Promise<boolean>,
  timeoutMs = 60000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await delay(500);
  }

  throw new Error("Timed out waiting for condition");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getAdminClient() {
  const client = new Client({
    connectionString: `postgres://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${postgresAdminDb}?sslmode=disable`,
  });

  await client.connect();
  return client;
}

function createChildEnv() {
  return {
    ...process.env,
    ADMIN_API_KEY: "test-admin-api-key",
    ARKHAMDB_BASE_URL: "https://arkhamdb.com",
    ARKHAMDB_OAUTH_CLIENT_ID: "test-client-id",
    ARKHAMDB_OAUTH_CLIENT_SECRET: "test-client-secret",
    ARKHAMDB_OAUTH_REDIRECT_URI: `${apiUrl}/auth/arkhamdb/callback`,
    CORS_ORIGINS: frontendUrl,
    ENABLE_JOB_SCHEDULES: "false",
    FROM_EMAIL: "noreply@arkham-build.local",
    FRONTEND_URL: frontendUrl,
    INGEST_JSON_DATA_REPO: "example/arkhamdb-json-data@master",
    INGEST_METADATA_REPO: "example/metadata-repo@master",
    INGEST_TABOO_DATA_REPO: "example/arkham-cards-data@master",
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
    VITE_ARKHAMDB_BASE_URL: "https://arkhamdb.com",
    VITE_CARD_IMAGE_URL: "https://assets.arkham.build",
    VITE_PAGE_NAME: "arkham.build",
    VITE_SHOW_PREVIEW_BANNER: "false",
    VITE_TURNSTILE_SITE_KEY: "",
    DATABASE_URL: databaseUrl,
    DBMATE_MIGRATIONS_DIR: "src/db/migrations",
  };
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sanitizeSql(sql: string) {
  return sql
    .split("\n")
    .filter((line) => !line.startsWith("\\"))
    .filter((line) => line !== "SET transaction_timeout = 0;")
    .join("\n");
}

async function waitForExit(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });
}
