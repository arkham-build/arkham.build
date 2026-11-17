import { runIngestJsonData } from "../../jobs/handlers/ingest-json-data/index.ts";
import { runPurgeCloudflareCache } from "../../jobs/handlers/purge-cloudflare-cache.ts";

await runIngestJsonData();
await runPurgeCloudflareCache();
