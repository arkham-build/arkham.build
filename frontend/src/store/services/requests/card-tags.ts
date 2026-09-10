import {
  type CardTagsSyncRequest,
  CardTagsSyncRequestSchema,
  type CardTagsSyncResponse,
  CardTagsSyncResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

class CardTagsConflictError extends ApiError {
  remote: CardTagsSyncResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "CardTagsConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchCardTags(
  client: HttpClient,
): Promise<CardTagsSyncResponse> {
  const res = await client.request("/v2/account/card-tags", {
    credentials: "include",
  });

  return CardTagsSyncResponseSchema.parse(await res.json());
}

export async function putCardTags(
  client: HttpClient,
  payload: CardTagsSyncRequest,
): Promise<CardTagsSyncResponse> {
  try {
    const res = await client.request("/v2/account/card-tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(CardTagsSyncRequestSchema.parse(payload)),
      credentials: "include",
    });

    return CardTagsSyncResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new CardTagsConflictError(error);
    }

    throw error;
  }
}

export function isCardTagsConflictError(
  error: unknown,
): error is CardTagsConflictError {
  return error instanceof CardTagsConflictError;
}

function parseConflictCause(cause: unknown): CardTagsSyncResponse | null {
  const result = CardTagsSyncResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
