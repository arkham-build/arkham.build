import { randomBytes } from "node:crypto";
import { OAUTH_FLOW_ERROR_CODES } from "@arkham-build/shared";
import type { Context } from "hono";
import { OAuthFlowError, type OAuthProvider } from "../../../../lib/oauth.ts";
import type { OAuthContext } from "./state.ts";
import { setOAuthStateCookie } from "./state.ts";

export async function beginOAuthAuthorization(
  c: Context,
  provider: OAuthProvider,
  oauthContext: OAuthContext,
) {
  const state = randomBytes(32).toString("hex");

  await setOAuthStateCookie(c, provider, oauthContext, state);

  return c.redirect(provider.getAuthorizationUrl(c, state));
}

export function redirectToOAuthError(
  c: Context,
  returnTo: string,
  error: unknown,
) {
  const url = new URL(returnTo, c.get("config").FRONTEND_URL);
  url.searchParams.set("oauth_error", getOAuthRedirectErrorCode(error));
  return c.redirect(url.toString());
}

function getOAuthRedirectErrorCode(error: unknown) {
  if (
    error instanceof OAuthFlowError &&
    OAUTH_FLOW_ERROR_CODES.has(error.code)
  ) {
    return error.code;
  }

  return "oauth_failed";
}
