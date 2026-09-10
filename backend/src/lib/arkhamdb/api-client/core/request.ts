import type { Context } from "hono";
import {
  FetchTimeoutError,
  fetchWithTimeout,
} from "../../../fetch-with-timeout.ts";
import type { HonoEnv } from "../../../hono-env.ts";
import {
  ApiError,
  isArkhamDBApiError,
  isOAuthErrorResponse,
} from "./errors.ts";
import { baseHeaders, mergeHeaders } from "./headers.ts";

export type WrappedResponse<T> = {
  data: T;
  headers: Record<string, string>;
  status: number;
};

const ARKHAMDB_REQUEST_TIMEOUT_MS = 90_000;

export async function request<T, E extends HonoEnv = HonoEnv>(
  c: Context<E>,
  path: string,
  options: RequestInit = {},
): Promise<WrappedResponse<T>> {
  const config = c.get("config");
  let res: Response;

  try {
    const method = options.method ?? "GET";
    const signal = options.signal
      ? AbortSignal.any([c.req.raw.signal, options.signal])
      : c.req.raw.signal;

    res = await fetchWithTimeout(`${config.ARKHAMDB_BASE_URL}${path}`, {
      ...options,
      headers: mergeHeaders(baseHeaders(method), options.headers),
      signal,
      timeoutMs: ARKHAMDB_REQUEST_TIMEOUT_MS,
    });
  } catch (err) {
    if (err instanceof FetchTimeoutError) {
      throw new ApiError("ArkhamDB request timed out", 500);
    }

    const cause = err instanceof Error ? err.cause : undefined;

    if (cause instanceof Error && "code" in cause) {
      throw new ApiError("Failed to connect to ArkhamDB", 500);
    }

    throw err;
  }

  await assertSuccessful(res);

  const data = (await res.json()) as T;

  return {
    data,
    headers: Object.fromEntries(res.headers),
    status: res.status,
  };
}

async function assertSuccessful(res: Response) {
  // Not found decklists return an empty html page
  if (res.headers.get("content-type")?.includes("html")) {
    throw new ApiError("Decklist not found", 404);
  }

  if (res.status >= 300) {
    // Not found decks redirect to login
    if (res.status === 302) {
      throw new ApiError("Deck not found", 404);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ApiError("Unknown API error", res.status);
    }

    if (isArkhamDBApiError(body)) {
      throw new ApiError(body.message, res.status);
    }

    if (res.status === 304) {
      throw new ApiError("Not Modified", 304);
    }

    if (isOAuthErrorResponse(body)) {
      throw new ApiError(body.error, res.status);
    }

    console.error("Unknown API error response:", body);
    throw new ApiError("Unknown API error", res.status);
  }
}
