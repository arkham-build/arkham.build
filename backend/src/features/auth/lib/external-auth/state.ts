import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { z } from "zod";
import { OAuthFlowError } from "../../../../lib/oauth.ts";

type ExternalAuthStateProvider = {
  getCallbackPath(c: Context): string;
};

export const ExternalAuthIntentSchema = z.enum(["login", "signup", "connect"]);

export const ExternalAuthContextSchema = z.object({
  accountId: z.string().optional(),
  intent: ExternalAuthIntentSchema,
  returnTo: z.string(),
});

const ExternalAuthStateCookieSchema = ExternalAuthContextSchema.extend({
  state: z.string(),
});

export type ExternalAuthIntent = z.infer<typeof ExternalAuthIntentSchema>;
export type ExternalAuthContext = z.infer<typeof ExternalAuthContextSchema>;
type ExternalAuthStateCookie = z.infer<typeof ExternalAuthStateCookieSchema>;

const EXTERNAL_AUTH_STATE_COOKIE_NAME = "arkham-build-oauth-state";
const EXTERNAL_AUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function setExternalAuthStateCookie(
  c: Context,
  provider: ExternalAuthStateProvider,
  externalAuthContext: ExternalAuthContext,
  state: string,
) {
  await setSignedCookie(
    c,
    EXTERNAL_AUTH_STATE_COOKIE_NAME,
    JSON.stringify({
      ...externalAuthContext,
      state,
    }),
    c.get("config").SESSION_SECRET,
    {
      httpOnly: true,
      maxAge: EXTERNAL_AUTH_STATE_MAX_AGE_SECONDS,
      path: provider.getCallbackPath(c),
      sameSite: "Lax",
      secure: c.get("config").NODE_ENV === "production",
    },
  );
}

export async function getExternalAuthContext(
  c: Context,
): Promise<ExternalAuthContext | null> {
  try {
    const externalAuthState = await getExternalAuthStateCookie(c);
    if (!externalAuthState) return null;

    return externalAuthState.accountId
      ? {
          accountId: externalAuthState.accountId,
          intent: externalAuthState.intent,
          returnTo: externalAuthState.returnTo,
        }
      : {
          intent: externalAuthState.intent,
          returnTo: externalAuthState.returnTo,
        };
  } catch {
    return null;
  }
}

export async function validateExternalAuthState(
  c: Context,
  provider: ExternalAuthStateProvider,
  state: string | undefined,
): Promise<ExternalAuthContext> {
  const externalAuthState = await getExternalAuthStateCookie(c);
  deleteExternalAuthStateCookie(c, provider);

  if (!state || !externalAuthState) {
    throw new OAuthFlowError("invalid_state");
  }

  if (externalAuthState.state !== state) {
    throw new OAuthFlowError("invalid_state");
  }

  return externalAuthState.accountId
    ? {
        accountId: externalAuthState.accountId,
        intent: externalAuthState.intent,
        returnTo: externalAuthState.returnTo,
      }
    : {
        intent: externalAuthState.intent,
        returnTo: externalAuthState.returnTo,
      };
}

async function getExternalAuthStateCookie(
  c: Context,
): Promise<ExternalAuthStateCookie | null> {
  const signedState = await getSignedCookie(
    c,
    c.get("config").SESSION_SECRET,
    EXTERNAL_AUTH_STATE_COOKIE_NAME,
  );

  return typeof signedState === "string"
    ? parseExternalAuthStateCookie(signedState)
    : null;
}

function parseExternalAuthStateCookie(
  signedState: string,
): ExternalAuthStateCookie {
  try {
    return ExternalAuthStateCookieSchema.parse(JSON.parse(signedState));
  } catch {
    throw new OAuthFlowError("invalid_state");
  }
}

function deleteExternalAuthStateCookie(
  c: Context,
  provider: ExternalAuthStateProvider,
) {
  deleteCookie(c, EXTERNAL_AUTH_STATE_COOKIE_NAME, {
    path: provider.getCallbackPath(c),
  });
}
