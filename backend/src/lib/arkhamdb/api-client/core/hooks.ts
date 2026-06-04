import type { Context } from "hono";
import type { HonoEnv, SessionAuthHonoEnv } from "../../../hono-env.ts";
import type { OAuthAccessToken } from "../../../oauth.ts";
import { refreshArkhamDbAccessTokenForAccount } from "../api-user.ts";
import type { ApiError } from "./errors.ts";
import type { WrappedResponse } from "./request.ts";

export type Hooks<E extends HonoEnv = HonoEnv> = {
  error?: (c: Context<E>, err: unknown) => Promise<void>;
  success?: (
    c: Context<E>,
    res: WrappedResponse<unknown> | undefined,
  ) => Promise<void>;
  unauthenticated?: (
    c: Context<E>,
    accessToken: OAuthAccessToken,
    err: ApiError,
  ) => Promise<OAuthAccessToken | undefined>;
};

export const authenticationHooks: Hooks<SessionAuthHonoEnv> = {
  async unauthenticated(c) {
    return await refreshArkhamDbAccessTokenForAccount(c);
  },
};
