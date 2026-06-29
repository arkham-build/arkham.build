import { randomBytes } from "node:crypto";
import { OAUTH_FLOW_ERROR_CODES } from "@arkham-build/shared";
import type { Context } from "hono";
import { OAuthFlowError } from "../../../../lib/oauth.ts";
import type { ExternalAuthContext } from "./state.ts";
import { setExternalAuthStateCookie } from "./state.ts";

type ExternalAuthProvider = {
  getAuthorizationUrl(c: Context, state: string): string;
  getCallbackPath(c: Context): string;
};

export async function beginExternalAuthAuthorization(
  c: Context,
  provider: ExternalAuthProvider,
  externalAuthContext: ExternalAuthContext,
) {
  const state = randomBytes(32).toString("hex");

  await setExternalAuthStateCookie(c, provider, externalAuthContext, state);

  return c.redirect(provider.getAuthorizationUrl(c, state));
}

export function redirectToExternalAuthError(
  c: Context,
  returnTo: string,
  error: unknown,
) {
  const url = new URL(returnTo, c.get("config").FRONTEND_URL);
  url.searchParams.set("oauth_error", getExternalAuthRedirectErrorCode(error));
  return c.redirect(url.toString());
}

function getExternalAuthRedirectErrorCode(error: unknown) {
  if (
    error instanceof OAuthFlowError &&
    OAUTH_FLOW_ERROR_CODES.has(error.code)
  ) {
    return error.code;
  }

  return "oauth_failed";
}
