import { connectionString, getDatabase } from "../../db/db.ts";
import {
  cleanupExpiredOAuthCredentials,
  OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE,
  OAUTH_CREDENTIAL_CLEANUP_MAX_BATCHES_PER_RUN,
} from "../../features/oauth/lib/credential-cleanup.ts";
import { configFromEnv } from "../../lib/config.ts";
import { log } from "../../lib/logger.ts";

export async function runCleanupOAuthCredentials(jobId: string) {
  const startedAt = Date.now();
  const config = configFromEnv();
  const db = getDatabase(connectionString(config));

  try {
    const result = await cleanupExpiredOAuthCredentials(db, {
      batchSize: OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE,
      maxBatches: OAUTH_CREDENTIAL_CLEANUP_MAX_BATCHES_PER_RUN,
      now: new Date(),
    });

    log("info", "Expired OAuth records cleaned up", {
      access_tokens_deleted: result.deleted.accessTokens,
      authorization_codes_deleted: result.deleted.authorizationCodes,
      authorization_requests_deleted: result.deleted.authorizationRequests,
      batches_processed: result.batches,
      continuation_required: result.continuationRequired,
      cutoff: result.cutoff.toISOString(),
      duration_ms: Date.now() - startedAt,
      job_id: jobId,
      refresh_tokens_deleted: result.deleted.refreshTokens,
    });

    return result;
  } catch (error) {
    log("error", "Failed to clean up expired OAuth records", {
      duration_ms: Date.now() - startedAt,
      error: String(error),
      job_id: jobId,
    });
    throw error;
  } finally {
    await db.destroy();
  }
}
