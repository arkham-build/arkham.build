import assert from "node:assert";
import { type Context, Hono } from "hono";
import { sessionAuth } from "../../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { OAuthFlowError } from "../../../lib/oauth.ts";
import { steamOpenIdProvider } from "../../../lib/steam/steam-openid-provider.ts";
import {
  beginExternalAuthAuthorization,
  redirectToExternalAuthError,
} from "../lib/external-auth/flow.ts";
import { getExternalAuthConnectReturnTo } from "../lib/external-auth/return-to.ts";
import {
  getExternalAuthContext,
  validateExternalAuthState,
} from "../lib/external-auth/state.ts";

export const steamOpenIdRoutes = new Hono<HonoEnv>();

steamOpenIdRoutes.get(
  "/connect",
  sessionAuth({ requireCompleteProfile: false }),
  (c) =>
    beginExternalAuthAuthorization(c, steamOpenIdProvider, {
      accountId: c.get("account").id,
      intent: "connect",
      returnTo: getExternalAuthConnectReturnTo(c.req.query("returnTo")),
    }),
);

steamOpenIdRoutes.get("/callback", handleSteamOpenIdCallback);

async function handleSteamOpenIdCallback(c: Context<HonoEnv>) {
  const config = c.get("config");
  const state = c.req.query("state");

  const externalAuthContext = await getExternalAuthContext(c);
  const returnTo = externalAuthContext?.returnTo ?? "/settings?tab=account";

  try {
    const validatedExternalAuthContext = await validateExternalAuthState(
      c,
      steamOpenIdProvider,
      state,
    );

    assert(state, "Missing Steam OpenID state.");

    assert(
      validatedExternalAuthContext.intent === "connect",
      "Unexpected Steam OpenID intent.",
    );

    assert(
      validatedExternalAuthContext.accountId,
      "Missing account ID for Steam OpenID connect.",
    );

    await getSteamOpenIdIdentity(c, state);

    return c.redirect(
      `${config.FRONTEND_URL}${validatedExternalAuthContext.returnTo}`,
    );
  } catch (error) {
    return redirectToExternalAuthError(c, returnTo, error);
  }
}

async function getSteamOpenIdIdentity(c: Context<HonoEnv>, state: string) {
  try {
    return await steamOpenIdProvider.getIdentity(c, state);
  } catch (error) {
    throw new OAuthFlowError("oauth_failed", error);
  }
}
