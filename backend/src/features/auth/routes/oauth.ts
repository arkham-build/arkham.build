import assert from "node:assert";
import { CompleteProfileRequestSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { arkhamdbOAuthProvider } from "../../../lib/arkhamdb/oauth-provider.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { OAuthFlowError } from "../../../lib/oauth.ts";
import { zodValidator } from "../../../lib/validation.ts";
import {
  beginOAuthAuthorization,
  redirectToOAuthError,
} from "../oauth/flow.ts";
import { setSessionCookie } from "../oauth/session-cookie.ts";
import { getOAuthContext, validateOAuthState } from "../oauth/state.ts";
import {
  accountNameExists,
  updateAccountName,
  upsertAccountFromOAuth,
} from "../queries/accounts.ts";
import {
  connectOAuthIdentityToAccount,
  getAccountIdentityByProviderUserId,
} from "../queries/identities.ts";
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
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/login", (c) =>
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/signup", (c) =>
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
    intent: "signup",
    returnTo: "/auth/signup",
  }),
);

arkhamdbOAuthRoutes.get("/connect", sessionAuth(), (c) =>
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
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
      throw new OAuthFlowError("oauth_missing_code");
    }

    const validatedOAuthContext = await validateOAuthState(
      c,
      arkhamdbOAuthProvider,
      state,
    );
    const accessToken = await arkhamdbOAuthProvider.exchangeCodeForToken(
      c,
      code,
    );
    const identity = await arkhamdbOAuthProvider.getIdentity(c, accessToken);

    if (validatedOAuthContext.intent === "connect") {
      assert(
        validatedOAuthContext.accountId,
        "Missing account ID for OAuth connect.",
      );

      const existingIdentity = await getAccountIdentityByProviderUserId(
        db,
        arkhamdbOAuthProvider.name,
        identity.providerUserId,
      );

      if (
        existingIdentity &&
        existingIdentity.account_id !== validatedOAuthContext.accountId
      ) {
        throw new OAuthFlowError("identity_belongs_to_another_account");
      }

      await connectOAuthIdentityToAccount(db, {
        accountId: validatedOAuthContext.accountId,
        accessToken,
        provider: arkhamdbOAuthProvider.name,
        providerUserId: identity.providerUserId,
      });

      return c.redirect(
        `${config.FRONTEND_URL}${validatedOAuthContext.returnTo}`,
      );
    }

    const { existing, session } = await upsertAccountFromOAuth(db, {
      accessToken,
      config,
      provider: arkhamdbOAuthProvider.name,
      providerUserId: identity.providerUserId,
    });

    setSessionCookie(c, session.id);
    const path = existing ? "/" : "/auth/signup/complete";
    return c.redirect(`${config.FRONTEND_URL}${path}`);
  } catch (error) {
    return redirectToOAuthError(c, returnTo, error);
  }
});

export default routes;
