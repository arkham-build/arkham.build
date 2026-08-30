import type { PgBoss } from "pg-boss";
import {
  TASK_CLEANUP_OAUTH_CREDENTIALS_QUEUE,
  TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE,
} from "./job-types.ts";

export async function registerSchedules(boss: PgBoss) {
  await boss.schedule(
    TASK_CLEANUP_OAUTH_CREDENTIALS_QUEUE,
    "15 * * * *",
    {},
    {
      key: "oauth-credential-cleanup-hourly",
      tz: "UTC",
    },
  );

  await boss.schedule(
    TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE,
    "0 4 * * *",
    {},
    {
      key: "daily",
      tz: "UTC",
    },
  );
}
