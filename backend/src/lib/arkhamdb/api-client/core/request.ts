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
