import assert from "node:assert";
import {
  type ArkhamDbIdentityState,
  ArkhamDbIdentityStateSchema,
} from "@arkham-build/shared";
import { Mutex } from "async-mutex";
import type { Context } from "hono";
import type { z } from "zod";
import type { Database } from "../../../../db/db.ts";
import type { AccountIdentity } from "../../../../db/schema.types.ts";
import {
  getAccountIdentityByAccountIdAndProvider,
  updateAccountIdentityState,
} from "../../../auth/account-identities.ts";
import {
  findArkhamDbIdentityWithTokenByAccountId,
  upsertOAuthToken,
} from "../../../auth/oauth-tokens.ts";
import type { SessionAuthHonoEnv } from "../../../hono-env.ts";
import type { OAuthAccessToken } from "../../../oauth.ts";
import { refreshAccessToken } from "../api-oauth.ts";
import { ApiError } from "./errors.ts";
import { mergeHeaders } from "./headers.ts";
import { request, type WrappedResponse } from "./request.ts";

type ArkhamDbRequest = <T, R = never>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
  handleApiError?: (error: ApiError) => WrappedResponse<R> | undefined,
) => Promise<WrappedResponse<T | R>>;

export type ArkhamDbExecutor = {
  connection: NonNullable<
    Awaited<ReturnType<typeof findArkhamDbIdentityWithTokenByAccountId>>
  >;
  context: Context<SessionAuthHonoEnv>;
  db: Database;
  patchIdentityFailure(error: unknown): Promise<void>;
  patchIdentityState(patch: Partial<ArkhamDbIdentityState>): Promise<void>;
  request: ArkhamDbRequest;
};

export async function withArkhamDbExecutor<T>(
  c: Context<SessionAuthHonoEnv>,
  run: (executor: ArkhamDbExecutor) => Promise<T>,
): Promise<T> {
  const db = c.get("db");
  const accountId = c.get("account").id;
  const initialConnection = await findArkhamDbIdentityWithTokenByAccountId(
    db,
    accountId,
  );

  if (!initialConnection) {
    throw await markArkhamDbConnectionMissing(db, accountId);
  }

  return await withArkhamDbUserLock(initialConnection.identity.id, async () => {
    const connection = await findArkhamDbIdentityWithTokenByAccountId(
      db,
      accountId,
    );

    if (!connection) {
      throw await markArkhamDbConnectionMissing(db, accountId);
    }

    const executor: ArkhamDbExecutor = {
      connection,
      context: c,
      db,
      patchIdentityFailure(error) {
        return patchArkhamDbIdentityFailure(executor, error);
      },
      patchIdentityState(patch) {
        return patchArkhamDbIdentityState(executor, patch);
      },
      request(path, schema, options, handleApiError) {
        return executeArkhamDbRequest(
          executor,
          path,
          schema,
          options,
          handleApiError,
        );
      },
    };

    return await run(executor);
  });
}

const arkhamDbUserLocks = new Map<string, Mutex>();

async function executeArkhamDbRequest<T, R = never>(
  executor: ArkhamDbExecutor,
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
  handleApiError?: (error: ApiError) => WrappedResponse<R> | undefined,
): Promise<WrappedResponse<T | R>> {
  const executeRequest = async (accessToken: string) =>
    parseWrappedResponse(
      await request<unknown, SessionAuthHonoEnv>(
        executor.context,
        `/api/oauth2${path}`,
        {
          ...options,
          headers: mergeHeaders(options.headers, {
            Authorization: `Bearer ${accessToken}`,
          }),
        },
      ),
      schema,
    );

  try {
    return await executeRequest(executor.connection.token.access_token);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }

    const handled = handleApiError?.(error);
    if (handled) {
      return handled;
    }

    if (error.status !== 401) {
      throw error;
    }
  }

  const accessToken = await refreshArkhamDbAccessTokenForConnection(executor);

  try {
    return await executeRequest(accessToken.access_token);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }

    const handled = handleApiError?.(error);
    if (handled) {
      return handled;
    }

    throw error;
  }
}

async function refreshArkhamDbAccessTokenForConnection(
  executor: ArkhamDbExecutor,
): Promise<OAuthAccessToken> {
  const refreshToken = executor.connection.token.refresh_token;

  assert(refreshToken, "Missing OAuth refresh token for ArkhamDB account.");

  try {
    const token = await refreshAccessToken(executor.context, refreshToken);
    await upsertOAuthToken(executor.db, executor.connection.identity.id, token);

    executor.connection.token.access_token = token.access_token;
    executor.connection.token.refresh_token = token.refresh_token;
    executor.connection.token.token_expires_at = new Date(
      Date.now() + token.expires_in * 1000,
    );

    await patchArkhamDbIdentityState(executor, {
      lastError: null,
      status: "healthy",
    });
    return token;
  } catch (error) {
    await patchArkhamDbIdentityFailure(executor, error);
    throw error;
  }
}

async function patchArkhamDbIdentityState(
  executor: ArkhamDbExecutor,
  patch: Partial<ArkhamDbIdentityState>,
) {
  await updateAccountIdentityState(
    executor.db,
    executor.connection.identity.id,
    buildArkhamDbIdentityState(
      executor.connection.state,
      patch,
    ) as AccountIdentity["state"],
  );
}

async function patchArkhamDbIdentityFailure(
  executor: ArkhamDbExecutor,
  error: unknown,
) {
  await patchArkhamDbIdentityState(executor, {
    lastError: error instanceof Error ? error.message : "Unknown error",
    status: "unhealthy",
  });
}

function parseWrappedResponse<T>(
  response: WrappedResponse<unknown>,
  schema: z.ZodType<T>,
): WrappedResponse<T> {
  return {
    ...response,
    data: schema.parse(response.data),
  };
}

function buildArkhamDbIdentityState(
  state: ArkhamDbIdentityState | null,
  patch: Partial<ArkhamDbIdentityState>,
) {
  return {
    lastError: state?.lastError ?? null,
    lastSyncedAt: state?.lastSyncedAt ?? null,
    status: state?.status ?? "healthy",
    username: state?.username ?? null,
    ...patch,
  };
}

async function markArkhamDbConnectionMissing(db: Database, accountId: string) {
  const message = "Missing ArkhamDB identity or OAuth token for account.";
  const identity = await getAccountIdentityByAccountIdAndProvider(
    db,
    accountId,
    "arkhamdb",
  );

  if (identity) {
    const parsed = ArkhamDbIdentityStateSchema.safeParse(identity.state);
    const state = parsed.success
      ? parsed.data
      : {
          lastError: null,
          lastSyncedAt: null,
          status: "healthy" as const,
          username: null,
        };

    await updateAccountIdentityState(db, identity.id, {
      ...state,
      lastError: message,
      status: "unhealthy",
    });
  }

  return new Error(message);
}

async function withArkhamDbUserLock<T>(
  identityId: string,
  run: () => Promise<T>,
) {
  let mutex: Mutex;
  if (arkhamDbUserLocks.has(identityId)) {
    mutex = arkhamDbUserLocks.get(identityId) as Mutex;
  } else {
    mutex = new Mutex();
    arkhamDbUserLocks.set(identityId, mutex);
  }

  try {
    return await mutex.runExclusive(run);
  } finally {
    if (arkhamDbUserLocks.get(identityId) === mutex && !mutex.isLocked()) {
      arkhamDbUserLocks.delete(identityId);
    }
  }
}
