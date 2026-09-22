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
  const method = options.method ?? "GET";
  const startedAt = Date.now();
  let res: Response;

  try {
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
      logRequestFailure(c, method, path, startedAt, err);
      throw new ApiError("ArkhamDB request timed out", 500);
    }

    const cause = err instanceof Error ? err.cause : undefined;

    if (err instanceof Error && cause instanceof Error && "code" in cause) {
      logRequestFailure(c, method, path, startedAt, err, cause);
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

function logRequestFailure<E extends HonoEnv>(
  c: Context<E>,
  method: string,
  path: string,
  startedAt: number,
  error: Error,
  cause?: Error,
) {
  const details: Record<string, unknown> = {
    duration_ms: Date.now() - startedAt,
    error: error.message,
    error_name: error.name,
    upstream_method: method,
    upstream_path: path,
  };

  if (error.stack) details["error_stack"] = error.stack;

  if (cause) {
    details["cause"] = cause.message;
    details["cause_name"] = cause.name;
    if (cause.stack) details["cause_stack"] = cause.stack;

    for (const property of [
      "address",
      "code",
      "errno",
      "hostname",
      "port",
      "syscall",
    ]) {
      const value = Reflect.get(cause, property);
      if (typeof value === "string" || typeof value === "number") {
        details[`cause_${property}`] = value;
      }
    }
  }

  c.get("logger")("error", "ArkhamDB request failed", details);
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
