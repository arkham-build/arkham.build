import {
  type Deck,
  type DeckBatchRequest,
  DeckBatchRequestSchema,
  DeckBatchResponseSchema,
  type DeckConflictResponse,
  DeckConflictResponseSchema,
  type DeckCreateRequest,
  DeckCreateRequestSchema,
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
} from "@arkham-build/shared";
import { ApiError, apiV2Request } from "./shared";

class DeckConflictError extends ApiError {
  remote: DeckConflictResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "DeckConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchDeckManifest(): Promise<DeckManifestResponse> {
  const res = await apiV2Request("/v2/decks/manifest", {
    credentials: "include",
  });

  return DeckManifestResponseSchema.parse(await res.json());
}

export async function fetchDeckBatch(
  payload: DeckBatchRequest,
): Promise<Deck[]> {
  const res = await apiV2Request("/v2/decks/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DeckBatchRequestSchema.parse(payload)),
    credentials: "include",
  });

  return DeckBatchResponseSchema.parse(await res.json());
}

export async function postDeck(payload: DeckCreateRequest): Promise<Deck> {
  const res = await apiV2Request("/v2/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DeckCreateRequestSchema.parse(payload)),
    credentials: "include",
  });

  return DeckSchema.parse(await res.json());
}

export async function putDeck(payload: DeckUpdateRequest): Promise<Deck> {
  try {
    const res = await apiV2Request(`/v2/decks/${payload.id}`, {
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
  id: DeckId,
  payload: DeckUpgradeRequest,
): Promise<Deck> {
  try {
    const res = await apiV2Request(`/v2/auth/upgrade/${id}`, {
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
  id: DeckId,
  payload: DeckDeleteRequest,
): Promise<void> {
  try {
    await apiV2Request(`/v2/decks/${id}`, {
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
