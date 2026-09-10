import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const schema = "pgboss";
const [command, inputMigrationName] = process.argv.slice(2);
assert(
  command === "create" || command === "migrate",
  "first arg must be create or migrate",
);
const migrationName =
  inputMigrationName ??
  (command === "create" ? "add_pg_boss_schema" : "migrate_pg_boss_schema");
assert(
  /^[a-z0-9_]+$/.test(migrationName),
  "migration name must match /^[a-z0-9_]+$/",
);
const now = new Date();
const timestamp = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, "0"),
  String(now.getUTCDate()).padStart(2, "0"),
  String(now.getUTCHours()).padStart(2, "0"),
  String(now.getUTCMinutes()).padStart(2, "0"),
  String(now.getUTCSeconds()).padStart(2, "0"),
].join("");
const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendDir = dirname(scriptDir);
const migrationsDir = join(backendDir, "src/db/migrations");
const migrationPath = join(migrationsDir, `${timestamp}_${migrationName}.sql`);
const pgBossCliPath = join(backendDir, "../node_modules/.bin/pg-boss");

const getPlanSql = (planCommand) => {
  const sql = execFileSync(
    pgBossCliPath,
    ["plans", planCommand, "--schema", schema],
    {
      cwd: backendDir,
      encoding: "utf8",
    },
  );
  const separator = "\n\n";
  const prefixEnd = sql.indexOf(separator);
  assert(prefixEnd !== -1, "expected pg-boss SQL plan header");
  return sql.slice(prefixEnd + separator.length).trimEnd();
};

const upSql = getPlanSql(command);
const downSql =
  command === "create"
    ? `DROP SCHEMA IF EXISTS ${schema} CASCADE;`
    : getPlanSql("rollback");
const migration = `-- migrate:up\n\n${upSql}\n\n-- migrate:down\n\n${downSql}\n`;
mkdirSync(migrationsDir, { recursive: true });
writeFileSync(migrationPath, migration);
process.stdout.write(`${migrationPath}\n`);
