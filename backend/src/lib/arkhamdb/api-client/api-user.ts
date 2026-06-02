import {
  type SessionAuthenticatedRequestDependencies,
  sessionAuthenticatedRequest,
} from "./core/authenticated-request.ts";
import { ApiError } from "./core/errors.ts";
import type { ArkhamDBDeck, OperationResponse } from "./core/responses.ts";

export type _OperationResponse = {
  msg: string | number;
  success: boolean;
};

export function fetchDeck(
  ctx: SessionAuthenticatedRequestDependencies,
  id: string | number,
) {
  return sessionAuthenticatedRequest<ArkhamDBDeck>(ctx, `/deck/load/${id}`);
}

export function fetchDecks(auth: SessionAuthenticatedRequestDependencies) {
  const ifModifiedSince = auth.context.req.header("If-Modified-Since");
  const headers = ifModifiedSince
    ? {
        "If-Modified-Since": ifModifiedSince,
      }
    : {};

  return sessionAuthenticatedRequest<ArkhamDBDeck[]>(auth, "/decks", {
    headers,
  });
}

export type SaveDeckPayload = Omit<
  Partial<ArkhamDBDeck>,
  "id" | "previous_deck" | "next_deck"
> & {
  slots: string;
  problem: ArkhamDBDeck["problem"];
};

export async function saveDeck(
  ctx: SessionAuthenticatedRequestDependencies,
  id: string,
  payload: SaveDeckPayload,
) {
  const { data: operation } =
    await sessionAuthenticatedRequest<OperationResponse>(
      ctx,
      `/deck/save/${id}`,
      {
        method: "PUT",
        body: encodeParams(payload),
      },
    );

  assertSuccessfulOperation(operation);

  return fetchDeck(ctx, operation.msg);
}

export type NewDeckPayload = Omit<SaveDeckPayload, "name"> & {
  name: string;
  investigator: string;
};

export async function createDeck(
  ctx: SessionAuthenticatedRequestDependencies,
  payload: NewDeckPayload,
) {
  const { investigator, ...rest } = payload;
  const { data: operation } =
    await sessionAuthenticatedRequest<OperationResponse>(ctx, "/deck/new", {
      method: "POST",
      body: encodeParams({
        investigator,
        name: rest.name,
        taboo: rest.taboo,
      }),
    });

  assertSuccessfulOperation(operation);

  return saveDeck(ctx, operation.msg.toString(), rest);
}

export type UpgradeDeckPayload = {
  xp: number;
  exiles?: string;
  meta: string;
};

export async function upgradeDeck(
  ctx: SessionAuthenticatedRequestDependencies,
  id: string | number,
  payload: UpgradeDeckPayload,
) {
  const { data: operation } =
    await sessionAuthenticatedRequest<OperationResponse>(
      ctx,
      `/deck/upgrade/${id}`,
      {
        method: "PUT",
        body: encodeParams(payload),
      },
    );

  assertSuccessfulOperation(operation);
  return fetchDeck(ctx, operation.msg);
}

export async function deleteDeck(
  ctx: SessionAuthenticatedRequestDependencies,
  deckId: string | number,
  all?: boolean,
) {
  const path = `/deck/delete/${deckId}`;
  const { data: operation } =
    await sessionAuthenticatedRequest<OperationResponse>(
      ctx,
      all ? `${path}?all=true` : path,
      {
        method: "DELETE",
      },
    );

  assertSuccessfulOperation(operation);
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

function assertSuccessfulOperation(res: OperationResponse) {
  if (!res.success) {
    throw new ApiError(res.msg?.toString() ?? "Unknown operation error.", 500);
  }
}
