import type { PgBoss, Queue } from "pg-boss";
import {
  EMAIL_DELIVER_QUEUE,
  TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE,
  TASK_INGEST_JSON_DATA_QUEUE,
  TASK_PURGE_CLOUDFLARE_CACHE_QUEUE,
} from "./job-types.ts";

const QUEUES: Queue[] = [
  {
    name: EMAIL_DELIVER_QUEUE,
    expireInSeconds: 300,
    retryBackoff: true,
    retryDelay: 30,
    retryLimit: 5,
  },
  {
    name: TASK_INGEST_JSON_DATA_QUEUE,
    expireInSeconds: 600,
    policy: "exclusive",
    retryBackoff: true,
    retryDelay: 60,
    retryLimit: 2,
  },
  {
    name: TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE,
    expireInSeconds: 3600,
    policy: "exclusive",
    retryBackoff: true,
    retryDelay: 60,
    retryLimit: 2,
  },
  {
    name: TASK_PURGE_CLOUDFLARE_CACHE_QUEUE,
    expireInSeconds: 600,
    policy: "exclusive",
    retryBackoff: true,
    retryDelay: 30,
    retryLimit: 2,
  },
];

export async function registerQueues(boss: PgBoss) {
  for (const queue of QUEUES) {
    await boss.createQueue(queue.name, queue);
  }
}
