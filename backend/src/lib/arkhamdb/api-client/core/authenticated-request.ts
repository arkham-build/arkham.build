import assert from "node:assert";
import type { Context } from "hono";
import type { HonoEnv, SessionAuthHonoEnv } from "../../../hono-env.ts";
import type { OAuthAccessToken } from "../../../oauth.ts";
import { ApiError } from "./errors.ts";
import { baseHeaders } from "./headers.ts";
import { authenticationHooks, type Hooks } from "./hooks.ts";
import { request, type WrappedResponse } from "./request.ts";

type AuthenticatedRequestOptions<E extends HonoEnv = HonoEnv> = {
  hooks?: Hooks<E>;
  retryCount?: number;
};

export type AuthenticatedRequestDependencies<E extends HonoEnv = HonoEnv> =
  AuthenticatedRequestOptions<E> & {
    context: Context<E>;
    accessToken: OAuthAccessToken;
  };

export type SessionAuthenticatedRequestDependencies =
  AuthenticatedRequestDependencies<SessionAuthHonoEnv>;

export async function authenticatedRequest<T, E extends HonoEnv = HonoEnv>(
  {
    context,
    accessToken,
    hooks,
    retryCount = 1,
  }: AuthenticatedRequestDependencies<E>,
  path: string,
  options: RequestInit = {},
): Promise<WrappedResponse<T>> {
  try {
    const res = await request<T, E>(context, `/api/oauth2${path}`, {
      ...options,
      headers: {
        ...baseHeaders(options.method),
        ...options?.headers,
        Authorization: `Bearer ${accessToken.access_token}`,
      },
    });

    await hooks?.success?.(context, res);
    return res;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && retryCount > 0) {
      const nextAccessToken = await hooks?.unauthenticated?.(
        context,
        accessToken,
        err,
      );

      if (!nextAccessToken) {
        throw err;
      }

      return authenticatedRequest<T, E>(
        {
          context,
          accessToken: nextAccessToken,
          ...(hooks ? { hooks } : {}),
          retryCount: retryCount - 1,
        },
        path,
        options,
      );
    }

    await hooks?.error?.(context, err);
    throw err;
  }
}

export function sessionAuthenticatedRequest<T>(
  { context, accessToken }: SessionAuthenticatedRequestDependencies,
  path: string,
  options: RequestInit = {},
) {
  assert(
    context.get("account"),
    "Missing account for session-authenticated request.",
  );

  return authenticatedRequest<T, SessionAuthHonoEnv>(
    {
      context,
      accessToken,
      hooks: authenticationHooks,
    },
    path,
    options,
  );
}
