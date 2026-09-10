import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { PgBoss } from "pg-boss";
import { EMAIL_DELIVER_QUEUE } from "../../backend/src/jobs/job-types.ts";
import {
  createArkhamDbOAuthApp,
  waitForArkhamDbReady,
} from "./lib/arkhamdb.ts";
import {
  apiUrl,
  createStackEnv,
  databaseUrl,
  dbName,
  frontendPort,
  frontendUrl,
  mailcrabUrl,
  postgresAdminDb,
  postgresHost,
  postgresPassword,
  postgresPort,
  postgresUser,
  runId,
} from "./lib/env.ts";
import { fetchJson, waitForCondition, waitForUrl } from "./lib/wait.ts";

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

const rootDir = path.resolve(import.meta.dirname, "../..");
const vitePath = path.join(rootDir, "node_modules/vite/bin/vite.js");
let childEnv = createStackEnv();
const state: State = {
  createdDatabase: false,
  children: [],
  shuttingDown: false,
};

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
  console.info("Creating test database...");
  await createDatabase();
  state.createdDatabase = true;

  console.info("Waiting for ArkhamDB...");
  await waitForArkhamDbReady();
  console.info("Creating ArkhamDB OAuth app...");
  const oauthApp = await createArkhamDbOAuthApp();
  childEnv = createStackEnv({
    ARKHAMDB_OAUTH_CLIENT_ID: oauthApp.clientId,
    ARKHAMDB_OAUTH_CLIENT_SECRET: oauthApp.clientSecret,
  });

  console.info("Building frontend...");
  await runCommand(
    process.execPath,
    [vitePath, "build"],
    path.join(rootDir, "frontend"),
  );

  console.info("Ingesting JSON data...");
  await runCommand("npm", ["run", "ingest:json-data", "-w", "backend"]);
  await waitForJsonDataReady();

  console.info("Starting worker...");
  startProcess("worker", process.execPath, [
    "--experimental-strip-types",
    "backend/src/worker.ts",
  ]);
  await waitForWorkerReady();

  console.info("Starting API...");
  startProcess("api", process.execPath, [
    "--experimental-strip-types",
    "backend/src/main.ts",
  ]);
  await waitForApiReady();

  console.info("Starting frontend...");
  startProcess(
    "frontend",
    process.execPath,
    [vitePath, "preview", "--host", "127.0.0.1", "--port", frontendPort],
    path.join(rootDir, "frontend"),
  );
  await waitForUrl(frontendUrl, (response) => response.ok);
  console.info("Fullstack server ready.");
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
    stdio: "ignore",
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

  await applyMigrations();
}

async function applyMigrations() {
  await runCommand("npm", [
    "run",
    "dbmate",
    "-w",
    "backend",
    "--",
    "--no-dump-schema",
    "up",
  ]);
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
  await waitForUrl(
    `${apiUrl}/v2/account/auth/me`,
    (response) => response.status < 500,
  );
}

async function waitForJsonDataReady() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await waitForCondition(
      async () => {
        const result = await client.query<{
          card_count: number;
        }>("SELECT card_count FROM data_version WHERE locale = $1", ["en"]);

        return (result.rows[0]?.card_count ?? 0) > 0;
      },
      10 * 60 * 1000,
    );
  } finally {
    await client.end();
  }
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

async function getAdminClient() {
  const client = new Client({
    connectionString: `postgres://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${postgresAdminDb}?sslmode=disable`,
  });

  await client.connect();
  return client;
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function waitForExit(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });
}
