import assert from "node:assert";
import { CompleteProfileRequestSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { isEmpty } from "../../../lib/is-empty.ts";
import { zodValidator } from "../../../lib/validation.ts";
import {
  authorize,
  exchangeAuthCodeForToken,
  fetchUserDecksForOAuth,
  getOAuthContext,
  OAuthError,
  validateOAuthState,
} from "../arkhamdb-oauth.ts";
import {
  getOAuthErrorCode,
  redirectToOAuthError,
  setSessionCookie,
} from "../helpers.ts";
import {
  accountNameExists,
  connectOAuthIdentityToAccount,
  getAccountIdentityByProviderUserId,
  updateAccountName,
  upsertAccountFromOAuth,
} from "../queries.ts";
import { sessionAuth } from "../session-auth-middleware.ts";

const routes = new Hono<HonoEnv>();

routes.post(
  "/complete-profile",
  sessionAuth(),
  zodValidator("json", CompleteProfileRequestSchema),
  async (c) => {
    const db = c.get("db");
    const account = c.get("account");
    const { username } = c.req.valid("json");

    await db.transaction().execute(async (tx) => {
      if (await accountNameExists(tx, username, account.id)) {
        throw new HTTPException(400, {
          message: "Username is already taken",
        });
      }

      await updateAccountName(tx, account.id, username);
    });

    return new Response(null, { status: 200 });
  },
);

export const arkhamdbOAuthRoutes = new Hono<HonoEnv>();

arkhamdbOAuthRoutes.get("/", (c) =>
  authorize(c, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/login", (c) =>
  authorize(c, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/signup", (c) =>
  authorize(c, {
    intent: "signup",
    returnTo: "/auth/signup",
  }),
);

arkhamdbOAuthRoutes.get("/connect", sessionAuth(), (c) =>
  authorize(c, {
    accountId: c.get("account").id,
    intent: "connect",
    returnTo: "/settings?tab=account",
  }),
);

arkhamdbOAuthRoutes.get("/callback", async (c) => {
  const db = c.get("db");
  const config = c.get("config");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthContext = await getOAuthContext(c);
  const returnTo = oauthContext?.returnTo ?? "/auth/login";

  try {
    if (!code) {
      throw new OAuthError("oauth_missing_code");
    }

    const validatedOAuthContext = await validateOAuthState(c, state);
    const accessToken = await exchangeAuthCodeForToken(c, code);
    const decks = await fetchUserDecksForOAuth(c, accessToken.access_token);

    if (isEmpty(decks)) {
      throw new OAuthError("arkhamdb_no_decks");
    }

    const firstDeck = decks[0];
    if (!firstDeck?.user_id) {
      throw new OAuthError("arkhamdb_invalid_response");
    }

    const providerUserId = firstDeck.user_id.toString();

    if (validatedOAuthContext.intent === "connect") {
      assert(
        validatedOAuthContext.accountId,
        "Missing account ID for OAuth connect.",
      );

      const existingIdentity = await getAccountIdentityByProviderUserId(
        db,
        "arkhamdb",
        providerUserId,
      );

      if (
        existingIdentity &&
        existingIdentity.account_id !== validatedOAuthContext.accountId
      ) {
        throw new OAuthError("identity_belongs_to_another_account");
      }

      await connectOAuthIdentityToAccount(db, {
        accountId: validatedOAuthContext.accountId,
        accessToken,
        provider: "arkhamdb",
        providerUserId,
      });

      return c.redirect(
        `${config.FRONTEND_URL}${validatedOAuthContext.returnTo}`,
      );
    }

    const { existing, session } = await upsertAccountFromOAuth(db, {
      accessToken,
      config,
      provider: "arkhamdb",
      providerUserId,
    });

    setSessionCookie(c, session.id);
    const path = existing ? "/" : "/auth/signup/complete";
    return c.redirect(`${config.FRONTEND_URL}${path}`);
  } catch (error) {
    const logger = c.get("logger");
    logger("warn", (error as Error).message);
    return redirectToOAuthError(c, returnTo, getOAuthErrorCode(error));
  }
});

export default routes;
