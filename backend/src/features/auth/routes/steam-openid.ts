import assert from "node:assert";
import { type Context, Hono } from "hono";
import { sessionAuth } from "../../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { steamOpenIdProvider } from "../../../lib/steam/steam-openid-provider.ts";
import {
  beginOAuthAuthorization,
  redirectToOAuthError,
} from "../lib/oauth/flow.ts";
import { getOAuthConnectReturnTo } from "../lib/oauth/return-to.ts";
import { getOAuthContext, validateOAuthState } from "../lib/oauth/state.ts";
import { connectSteamIdentityToAccount } from "../queries/identities.ts";

export const steamOpenIdRoutes = new Hono<HonoEnv>();

steamOpenIdRoutes.get(
  "/connect",
  sessionAuth({ requireCompleteProfile: false }),
  (c) =>
    beginOAuthAuthorization(c, steamOpenIdProvider, {
      accountId: c.get("account").id,
      intent: "connect",
      returnTo: getOAuthConnectReturnTo(c.req.query("returnTo")),
    }),
);

steamOpenIdRoutes.get("/callback", handleSteamOpenIdCallback);

async function handleSteamOpenIdCallback(c: Context<HonoEnv>) {
  const config = c.get("config");
  const db = c.get("db");
  const state = c.req.query("state");

  const oauthContext = await getOAuthContext(c);
  const returnTo = oauthContext?.returnTo ?? "/settings?tab=account";

  try {
    const validatedOAuthContext = await validateOAuthState(
      c,
      steamOpenIdProvider,
      state,
    );

    assert(state, "Missing Steam OpenID state.");

    assert(
      validatedOAuthContext.intent === "connect",
      "Unexpected Steam OpenID intent.",
    );

    assert(
      validatedOAuthContext.accountId,
      "Missing account ID for Steam OpenID connect.",
    );

    const identity = await steamOpenIdProvider.getIdentity(c, state);

    await connectSteamIdentityToAccount(db, {
      accountId: validatedOAuthContext.accountId,
      profile: identity.profile,
      providerUserId: identity.providerUserId,
    });

    return c.redirect(
      `${config.FRONTEND_URL}${validatedOAuthContext.returnTo}`,
    );
  } catch (error) {
    return redirectToOAuthError(c, returnTo, error);
  }
}
