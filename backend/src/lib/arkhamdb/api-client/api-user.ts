import assert from "node:assert";
import {
  type ArkhamDbIdentityState,
  type Deck,
  type DeckWritePayload,
  SlotsSchema,
} from "@arkham-build/shared";
import type { Context } from "hono";
import type { z } from "zod";
import type { AccountIdentity } from "../../../db/schema.types.ts";
import { updateAccountIdentityState } from "../../../features/auth/queries/identities.ts";
import { upsertOAuthToken } from "../../../features/auth/queries/oauth-tokens.ts";
import type { SessionAuthHonoEnv } from "../../hono-env.ts";
import type { OAuthAccessToken } from "../../oauth.ts";
import { refreshAccessToken } from "./api-oauth.ts";
import {
  ArkhamDbOperationResponseSchema,
  ArkhamDbRemoteDeckSchema,
  ArkhamDbRemoteDecksSchema,
  ArkhamDbSuccessResponseSchema,
} from "./core/dtos.ts";
import { ApiError } from "./core/errors.ts";
import {
  type ArkhamDbExecutor,
  withArkhamDbExecutor,
} from "./core/execute-with-lock.ts";
import { request, type WrappedResponse } from "./core/request.ts";

export function fetchDeck(c: Context<SessionAuthHonoEnv>, id: string | number) {
  return withArkhamDbExecutor(c, (executor) =>
    executeArkhamDbRequest(
      executor,
      `/deck/load/${id}`,
      ArkhamDbRemoteDeckSchema,
    ),
  );
}

export function syncDecks(
  c: Context<SessionAuthHonoEnv>,
  syncedAt = new Date(),
  ifModifiedSince?: string | null,
) {
  return withArkhamDbExecutor(c, async (executor) => {
    try {
      const headers =
        typeof ifModifiedSince === "string"
          ? {
              "If-Modified-Since": ifModifiedSince,
            }
          : {};

      const response = await executeArkhamDbRequest(
        executor,
        "/decks",
        ArkhamDbRemoteDecksSchema,
        { headers },
        (error) => {
          if (error.status !== 304) return;

          return {
            data: undefined,
            headers,
            status: 304,
          };
        },
      );

      await patchArkhamDbIdentityState(executor, {
        lastError: null,
        lastSyncedAt: syncedAt.toISOString(),
        status: "healthy",
      });

      return response;
    } catch (error) {
      await patchArkhamDbIdentityFailure(executor, error);
      throw error;
    }
  });
}

export function saveDeck(
  c: Context<SessionAuthHonoEnv>,
  id: string | number,
  deck: DeckWritePayload,
) {
  return withArkhamDbExecutor(c, async (executor) => {
    const { data: operation } = await executeArkhamDbRequest(
      executor,
      `/deck/save/${id}`,
      ArkhamDbOperationResponseSchema,
      {
        method: "PUT",
        body: encodeParams({
          description_md: deck.description_md,
          exile_string: deck.exile_string ?? undefined,
          ignored: stringifyOptionalSlots(deck.ignoreDeckLimitSlots),
          meta: deck.meta,
          name: deck.name,
          problem: deck.problem,
          side: stringifyOptionalSlots(deck.sideSlots),
          slots: JSON.stringify(SlotsSchema.parse(deck.slots)),
          taboo: deck.taboo_id ?? undefined,
          tags: deck.tags,
          xp_adjustment: deck.xp_adjustment ?? undefined,
          xp_spent: deck.xp_spent ?? undefined,
        }),
      },
    );

    assertSuccessfulOperation(operation);
    return await executeArkhamDbRequest(
      executor,
      `/deck/load/${operation.msg}`,
      ArkhamDbRemoteDeckSchema,
    );
  });
}

export function createDeck(
  c: Context<SessionAuthHonoEnv>,
  deck: DeckWritePayload,
) {
  return withArkhamDbExecutor(c, async (executor) => {
    const { data: operation } = await executeArkhamDbRequest(
      executor,
      "/deck/new",
      ArkhamDbOperationResponseSchema,
      {
        method: "POST",
        body: encodeParams({
          investigator: deck.investigator_code,
          name: deck.name,
          taboo: deck.taboo_id ?? undefined,
        }),
      },
    );

    assertSuccessfulOperation(operation);

    const { data: saveOperation } = await executeArkhamDbRequest(
      executor,
      `/deck/save/${operation.msg}`,
      ArkhamDbOperationResponseSchema,
      {
        method: "PUT",
        body: encodeParams({
          description_md: deck.description_md,
          exile_string: deck.exile_string ?? undefined,
          ignored: stringifyOptionalSlots(deck.ignoreDeckLimitSlots),
          meta: deck.meta,
          name: deck.name,
          problem: deck.problem,
          side: stringifyOptionalSlots(deck.sideSlots),
          slots: JSON.stringify(SlotsSchema.parse(deck.slots)),
          taboo: deck.taboo_id ?? undefined,
          tags: deck.tags,
          xp_adjustment: deck.xp_adjustment ?? undefined,
          xp_spent: deck.xp_spent ?? undefined,
        }),
      },
    );

    assertSuccessfulOperation(saveOperation);
    return await executeArkhamDbRequest(
      executor,
      `/deck/load/${saveOperation.msg}`,
      ArkhamDbRemoteDeckSchema,
    );
  });
}

export function upgradeDeck(
  c: Context<SessionAuthHonoEnv>,
  id: string | number,
  deck: Pick<Deck, "exile_string" | "meta" | "xp">,
) {
  return withArkhamDbExecutor(c, async (executor) => {
    const { data: operation } = await executeArkhamDbRequest(
      executor,
      `/deck/upgrade/${id}`,
      ArkhamDbOperationResponseSchema,
      {
        method: "PUT",
        body: encodeParams({
          exiles: deck.exile_string ?? undefined,
          meta: deck.meta,
          xp: deck.xp ?? 0,
        }),
      },
    );

    assertSuccessfulOperation(operation);
    return await executeArkhamDbRequest(
      executor,
      `/deck/load/${operation.msg}`,
      ArkhamDbRemoteDeckSchema,
    );
  });
}

export function deleteDeck(
  c: Context<SessionAuthHonoEnv>,
  deckId: string | number,
  all?: boolean,
) {
  return withArkhamDbExecutor(c, async (executor) => {
    const path = `/deck/delete/${deckId}`;
    const { data: operation } = await executeArkhamDbRequest(
      executor,
      all ? `${path}?all=true` : path,
      ArkhamDbSuccessResponseSchema,
      {
        method: "DELETE",
      },
    );

    assertSuccessfulOperation(operation);
  });
}

export function refreshArkhamDbAccessTokenForAccount(
  c: Context<SessionAuthHonoEnv>,
) {
  return withArkhamDbExecutor(c, (executor) =>
    refreshArkhamDbAccessTokenForConnection(executor),
  );
}

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
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
          },
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
  assert(
    executor.connection.token.refresh_token,
    "Missing OAuth refresh token for ArkhamDB account.",
  );

  try {
    const token = await refreshAccessToken(
      executor.context,
      executor.connection.token.refresh_token,
    );
    await upsertOAuthToken(executor.db, executor.connection.identity.id, token);
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

function stringifyOptionalSlots(
  value: Record<string, number> | null | undefined,
) {
  return value == null ? undefined : JSON.stringify(SlotsSchema.parse(value));
}

function encodeParams(data: Record<string, unknown>) {
  const payload = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        payload.append(key, item.toString());
      }
    } else {
      payload.append(key, value.toString());
    }
  }

  return new URLSearchParams(payload).toString();
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

function assertSuccessfulOperation(res: {
  success: boolean;
  msg?: string | number | null | undefined;
}) {
  if (!res.success) {
    throw new ApiError(res.msg?.toString() ?? "Unknown operation error.", 500);
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
