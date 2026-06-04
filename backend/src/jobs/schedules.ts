import type { PgBoss } from "pg-boss";
import { TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE } from "./job-types.ts";

export async function registerSchedules(boss: PgBoss) {
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
