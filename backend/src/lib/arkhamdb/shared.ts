import assert from "node:assert";
import type { Context } from "hono";
import { refreshToken } from "../../features/auth/arkhamdb-oauth.ts";
import {
  getOAuthTokenForSession,
  upsertOAuthToken,
} from "../common-queries.ts";
import type { HonoEnv } from "../hono-env.ts";
import type {
  ArkhamDBApiError,
  OAuthErrorResponse,
  OperationResponse,
  WrappedResponse,
} from "./types.ts";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

    if (isOAuthErrorResponse(body)) {
      throw new ApiError(body.error, res.status);
    }

    console.error("Unknown API error response:", body);
    throw new ApiError("Unknown API error", res.status);
  }
}

export function assertSuccessfulOperation(res: OperationResponse) {
  if (!res.success) {
    throw new ApiError(res.msg?.toString() ?? "Unknown operation error.", 500);
  }
}

function baseHeaders(method = "GET"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "api.arkham.build (https://arkham.build)",
  };

  if (method === "POST" || method === "PUT") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  return headers;
}

export function encodeParams(data: Record<string, unknown>) {
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

function isArkhamDBApiError(x: unknown): x is ArkhamDBApiError {
  return typeof x === "object" && x !== null && "code" in x && "message" in x;
}

function isOAuthErrorResponse(x: unknown): x is OAuthErrorResponse {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    "error_description" in x
  );
}

export async function request<T>(
  ctx: Context<HonoEnv>,
  path: string,
  options: RequestInit = {},
): Promise<WrappedResponse<T>> {
  const res = await fetch(`${ctx.var.config.ARKHAMDB_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      ...baseHeaders(),
    },
  });

  await assertSuccessful(res);

  const data = (await res.json()) as T;

  return {
    data,
    headers: Object.fromEntries(res.headers),
    status: res.status,
  };
}

export async function authenticatedRequest<T>(
  ctx: Context<HonoEnv>,
  path: string,
  options: RequestInit = {},
  retryCount = 1,
): Promise<WrappedResponse<T>> {
  const session = ctx.get("session");
  assert(session, new ApiError("No session found in context", 401));

  const oauthToken = await getOAuthTokenForSession(
    ctx.var.db,
    session,
    "arkhamdb",
  );
  assert(oauthToken, new ApiError("No oauth token found for session", 401));

  try {
    const res = await request<T>(ctx, `/api/oauth2${path}`, {
      ...options,
      headers: {
        ...baseHeaders(options.method),
        ...options?.headers,
        Authorization: `Bearer ${oauthToken.access_token}`,
      },
    });

    return res;
  } catch (err) {
    if (err instanceof ApiError && err.status < 400) {
      // await updateSessionCookie(ctx, session);
    }

    if (
      oauthToken.refresh_token &&
      err instanceof ApiError &&
      err.status === 401 &&
      retryCount > 0
    ) {
      const token = await refreshToken(ctx, oauthToken.refresh_token);
      await upsertOAuthToken(ctx.var.db, oauthToken.account_identity_id, token);
      return authenticatedRequest<T>(ctx, path, options, retryCount - 1);
    }

    throw err;
  }
}

export function publicRequest<T>(ctx: Context<HonoEnv>, path: string) {
  return request<T>(ctx, `/api/public${path}`, {
    headers: {
      "X-Forwarded-For": ctx.req.header("CF-Connecting-IP") ?? "",
    },
  });
}
