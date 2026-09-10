import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { z } from "zod";
import { OAuthFlowError, type OAuthProvider } from "../../../../lib/oauth.ts";

export const OAuthIntentSchema = z.enum(["login", "signup", "connect"]);

export const OAuthContextSchema = z.object({
  accountId: z.string().optional(),
  intent: OAuthIntentSchema,
  returnTo: z.string(),
});

const OAuthStateCookieSchema = OAuthContextSchema.extend({
  state: z.string(),
});

export type OAuthIntent = z.infer<typeof OAuthIntentSchema>;
export type OAuthContext = z.infer<typeof OAuthContextSchema>;
type OAuthStateCookie = z.infer<typeof OAuthStateCookieSchema>;

const OAUTH_STATE_COOKIE_NAME = "arkham-build-oauth-state";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function setOAuthStateCookie(
  c: Context,
  provider: OAuthProvider,
  oauthContext: OAuthContext,
  state: string,
) {
  await setSignedCookie(
    c,
    OAUTH_STATE_COOKIE_NAME,
    JSON.stringify({
      ...oauthContext,
      state,
    }),
    c.get("config").SESSION_SECRET,
    {
      httpOnly: true,
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
      path: provider.getCallbackPath(c),
      sameSite: "Lax",
      secure: c.get("config").NODE_ENV === "production",
    },
  );
}

export async function getOAuthContext(
  c: Context,
): Promise<OAuthContext | null> {
  try {
    const oauthState = await getOAuthStateCookie(c);

    if (!oauthState) {
      return null;
    }

    return oauthState.accountId
      ? {
          accountId: oauthState.accountId,
          intent: oauthState.intent,
          returnTo: oauthState.returnTo,
        }
      : {
          intent: oauthState.intent,
          returnTo: oauthState.returnTo,
        };
  } catch {
    return null;
  }
}

export async function validateOAuthState(
  c: Context,
  provider: OAuthProvider,
  state: string | undefined,
): Promise<OAuthContext> {
  const oauthState = await getOAuthStateCookie(c);
  deleteOAuthStateCookie(c, provider);

  if (!state || !oauthState) {
    throw new OAuthFlowError("invalid_state");
  }

  if (oauthState.state !== state) {
    throw new OAuthFlowError("invalid_state");
  }

  return oauthState.accountId
    ? {
        accountId: oauthState.accountId,
        intent: oauthState.intent,
        returnTo: oauthState.returnTo,
      }
    : {
        intent: oauthState.intent,
        returnTo: oauthState.returnTo,
      };
}

async function getOAuthStateCookie(
  c: Context,
): Promise<OAuthStateCookie | null> {
  const signedState = await getSignedCookie(
    c,
    c.get("config").SESSION_SECRET,
    OAUTH_STATE_COOKIE_NAME,
  );

  if (typeof signedState !== "string") {
    return null;
  }

  return parseOAuthStateCookie(signedState);
}

function parseOAuthStateCookie(signedState: string): OAuthStateCookie {
  try {
    return OAuthStateCookieSchema.parse(JSON.parse(signedState));
  } catch {
    throw new OAuthFlowError("invalid_state");
  }
}

function deleteOAuthStateCookie(c: Context, provider: OAuthProvider) {
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, {
    path: provider.getCallbackPath(c),
  });
}
