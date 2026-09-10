export const EMAIL_DELIVER_QUEUE = "email.send";
export const TASK_INGEST_JSON_DATA_QUEUE = "ingest.json-data";
export const TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE = "ingest.arkhamdb-decklists";
export const TASK_PURGE_CLOUDFLARE_CACHE_QUEUE = "cloudflare.purge-cache";

export type DeliverEmailJobData = {
  subject: string;
  text: string;
  to: string;
};

export type JobPayloadMap = {
  [EMAIL_DELIVER_QUEUE]: DeliverEmailJobData;
  [TASK_INGEST_JSON_DATA_QUEUE]: Record<string, never>;
  [TASK_INGEST_ARKHAMDB_DECKLISTS_QUEUE]: Record<string, never>;
  [TASK_PURGE_CLOUDFLARE_CACHE_QUEUE]: Record<string, never>;
};

export type JobName = keyof JobPayloadMap;
