import assert from "node:assert/strict";
import { fromKysely, type KyselyTransactionLike, type PgBoss } from "pg-boss";
import {
  type DeliverEmailJobData,
  EMAIL_DELIVER_QUEUE,
  type JobName,
  type JobPayloadMap,
  TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE,
  TASK_INGEST_JSON_DATA_QUEUE,
  TASK_PURGE_CLOUDFLARE_CACHE_QUEUE,
} from "./job-types.ts";

export type EnqueueOptions = {
  tx?: KyselyTransactionLike;
};

export interface JobDispatcher {
  enqueueEmail(
    data: DeliverEmailJobData,
    options?: EnqueueOptions,
  ): Promise<void>;
  enqueueIngestArkhamDbDecklists(options?: EnqueueOptions): Promise<void>;
  enqueueIngestJsonData(options?: EnqueueOptions): Promise<void>;
  enqueuePurgeCloudflareCache(options?: EnqueueOptions): Promise<void>;
}

export class PgBossJobDispatcher implements JobDispatcher {
  #boss: PgBoss;

  constructor(boss: PgBoss) {
    this.#boss = boss;
  }

  enqueueEmail(data: DeliverEmailJobData, options?: EnqueueOptions) {
    return this.#send(EMAIL_DELIVER_QUEUE, data, options);
  }

  enqueueIngestArkhamDbDecklists(options?: EnqueueOptions) {
    return this.#send(TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE, {}, options);
  }

  enqueueIngestJsonData(options?: EnqueueOptions) {
    return this.#send(TASK_INGEST_JSON_DATA_QUEUE, {}, options);
  }

  enqueuePurgeCloudflareCache(options?: EnqueueOptions) {
    return this.#send(TASK_PURGE_CLOUDFLARE_CACHE_QUEUE, {}, options);
  }

  async #send<TName extends JobName>(
    name: TName,
    data: JobPayloadMap[TName],
    options?: EnqueueOptions,
  ) {
    const sendOptions = options?.tx
      ? { db: fromKysely(options.tx) }
      : undefined;
    const jobId = await this.#boss.send(name, data, sendOptions);
    assert(jobId, `Failed to enqueue job: ${name}`);
  }
}
