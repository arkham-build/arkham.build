import { PgBoss } from "pg-boss";
import { connectionString } from "../db/db.ts";
import type { Config } from "../lib/config.ts";
import { log } from "../lib/logger.ts";

export function createPgBoss(config: Config) {
  const boss = new PgBoss({
    connectionString: connectionString(config),
    ...(config.NODE_ENV === "development"
      ? { monitorIntervalSeconds: 5, persistWarnings: true }
      : {}),
    schema: "pgboss",
  });

  boss.on("error", (error) => {
    log("error", "pg-boss error", {
      error: String(error),
    });
  });

  boss.on("warning", (warning) => {
    log("warn", "pg-boss warning", {
      warning,
    });
  });

  return boss;
}
