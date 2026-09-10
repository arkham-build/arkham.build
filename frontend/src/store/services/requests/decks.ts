import {
  type Deck,
  type DeckBatchRequest,
  DeckBatchRequestSchema,
  DeckBatchResponseSchema,
  type DeckConflictResponse,
  DeckConflictResponseSchema,
  type DeckDeleteRequest,
  DeckDeleteRequestSchema,
  type DeckId,
  type DeckManifestResponse,
  DeckManifestResponseSchema,
  DeckSchema,
  type DeckUpdateRequest,
  DeckUpdateRequestSchema,
  type DeckUpgradeRequest,
  DeckUpgradeRequestSchema,
  type DeckUploadBatchRequest,
  DeckUploadBatchRequestSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

class DeckConflictError extends ApiError {
  remote: DeckConflictResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "DeckConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchDeckManifest(
  client: HttpClient,
  opts: { forceArkhamdbSync?: boolean } = {},
): Promise<DeckManifestResponse> {
  const path = opts.forceArkhamdbSync
    ? "/v2/account/decks/manifest?forceArkhamdbSync=true"
    : "/v2/account/decks/manifest";

  const res = await client.request(path, {
    credentials: "include",
  });

  return DeckManifestResponseSchema.parse(await res.json());
}

export async function fetchDeckBatch(
  client: HttpClient,
  payload: DeckBatchRequest,
): Promise<Deck[]> {
  const res = await client.request("/v2/account/decks/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DeckBatchRequestSchema.parse(payload)),
    credentials: "include",
  });

  return DeckBatchResponseSchema.parse(await res.json());
}

export async function postDeck(
  client: HttpClient,
  payload: Deck,
): Promise<Deck> {
  const res = await client.request("/v2/account/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DeckSchema.parse(payload)),
    credentials: "include",
  });

  return DeckSchema.parse(await res.json());
}

export async function postDeckUploadBatch(
  client: HttpClient,
  payload: DeckUploadBatchRequest,
): Promise<Deck[]> {
  const res = await client.request("/v2/account/decks/upload/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DeckUploadBatchRequestSchema.parse(payload)),
    credentials: "include",
  });

  return DeckBatchResponseSchema.parse(await res.json());
}

export async function putDeck(
  client: HttpClient,
  payload: DeckUpdateRequest,
): Promise<Deck> {
  try {
    const res = await client.request(`/v2/account/decks/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DeckUpdateRequestSchema.parse(payload)),
      credentials: "include",
    });

    return DeckSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new DeckConflictError(error);
    }

    throw error;
  }
}

export async function postDeckUpgrade(
  client: HttpClient,
  id: DeckId,
  payload: DeckUpgradeRequest,
): Promise<Deck> {
  try {
    const res = await client.request(`/v2/account/decks/upgrade/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DeckUpgradeRequestSchema.parse(payload)),
      credentials: "include",
    });

    return DeckSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new DeckConflictError(error);
    }

    throw error;
  }
}

export async function deleteDeck(
  client: HttpClient,
  id: DeckId,
  payload: DeckDeleteRequest,
): Promise<void> {
  try {
    await client.request(`/v2/account/decks/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DeckDeleteRequestSchema.parse(payload)),
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new DeckConflictError(error);
    }

    throw error;
  }
}

export function isDeckConflictError(
  error: unknown,
): error is DeckConflictError {
  return error instanceof DeckConflictError;
}

function parseConflictCause(cause: unknown): DeckConflictResponse | null {
  const result = DeckConflictResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
