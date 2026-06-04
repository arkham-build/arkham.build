import type { Context } from "hono";
import type { HonoEnv } from "../../../hono-env.ts";
import {
  ApiError,
  isArkhamDBApiError,
  isOAuthErrorResponse,
} from "./errors.ts";
import { baseHeaders } from "./headers.ts";

export type WrappedResponse<T> = {
  data: T;
  headers: Record<string, string>;
  status: number;
};

const ARKHAMDB_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

export async function request<T, E extends HonoEnv = HonoEnv>(
  c: Context<E>,
  path: string,
  options: RequestInit = {},
): Promise<WrappedResponse<T>> {
  const config = c.get("config");
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    ARKHAMDB_REQUEST_TIMEOUT_MS,
  );

  let res: Response;

  try {
    const method = options.method ?? "GET";

    res = await fetch(`${config.ARKHAMDB_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...baseHeaders(method),
        ...options.headers,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("ArkhamDB request timed out", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
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
  if (res.status >= 300) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ApiError("Failed to parse body", res.status);
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
