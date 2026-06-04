import type { PgBoss } from "pg-boss";
import { PgBossJobDispatcher } from "../dispatcher.ts";
import { runIngestArkhamDbDecklists } from "../handlers/ingest-arkhamdb-decklists.ts";
import { runIngestJsonData } from "../handlers/ingest-json-data/index.ts";
import { runPurgeCloudflareCache } from "../handlers/purge-cloudflare-cache.ts";
import {
  TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE,
  TASK_INGEST_JSON_DATA_QUEUE,
  TASK_PURGE_CLOUDFLARE_CACHE_QUEUE,
} from "../job-types.ts";

export async function registerTaskWorkers(boss: PgBoss) {
  const dispatcher = new PgBossJobDispatcher(boss);

  await boss.work(TASK_INGEST_JSON_DATA_QUEUE, async (jobs) => {
    for (const _job of jobs) {
      await runIngestJsonData();
      await dispatcher.enqueuePurgeCloudflareCache();
    }
  });

  await boss.work(TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE, async (jobs) => {
    for (const _job of jobs) {
      await runIngestArkhamDbDecklists();
    }
  });

  await boss.work(TASK_PURGE_CLOUDFLARE_CACHE_QUEUE, async (jobs) => {
    for (const _job of jobs) {
      await runPurgeCloudflareCache();
    }
  });
}
