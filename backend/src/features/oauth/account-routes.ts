import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import {
  approveOAuthAuthorizationRequest,
  claimOAuthAuthorizationRequest,
  denyOAuthAuthorizationRequest,
  OAuthConsentError,
} from "./consent.ts";
import { OAUTH_SCOPES } from "./scopes.ts";

const AuthorizationRequestTokenSchema = z
  .string()
  .regex(/^ab_ar_[A-Za-z0-9_-]{43}$/);

export const OAuthConsentDetailsResponseSchema = z
  .object({
    client: z
      .object({
        id: z.uuid(),
        name: z.string(),
      })
      .strict(),
    scopes: z.array(z.enum(OAUTH_SCOPES)),
    expiresAt: z.iso.datetime(),
  })
  .strict();

const routes = new Hono<HonoEnv>();

routes.post(
  "/authorization-requests/:token/claim",
  sessionAuth(),
  async (c) => {
    try {
      const details = await claimOAuthAuthorizationRequest(
        c.get("db"),
        requestToken(c),
        c.get("account").id,
      );

      return c.json(
        OAuthConsentDetailsResponseSchema.parse({
          client: details.client,
          scopes: details.scopes,
          expiresAt: details.expiresAt.toISOString(),
        }),
      );
    } catch (error) {
      throw mapConsentError(error);
    }
  },
);

routes.post(
  "/authorization-requests/:token/approve",
  sessionAuth(),
  async (c) => {
    try {
      const result = await approveOAuthAuthorizationRequest(
        c.get("db"),
        requestToken(c),
        c.get("account").id,
      );
      return c.redirect(result.redirectUrl, 302);
    } catch (error) {
      throw mapConsentError(error);
    }
  },
);

routes.post("/authorization-requests/:token/deny", sessionAuth(), async (c) => {
  try {
    const result = await denyOAuthAuthorizationRequest(
      c.get("db"),
      requestToken(c),
      c.get("account").id,
    );
    return c.redirect(result.redirectUrl, 302);
  } catch (error) {
    throw mapConsentError(error);
  }
});

function requestToken(c: { req: { param(name: string): string } }) {
  const result = AuthorizationRequestTokenSchema.safeParse(
    c.req.param("token"),
  );
  if (!result.success) {
    throw new HTTPException(400, {
      message: "Authorization request is invalid or expired",
    });
  }

  return result.data;
}

function mapConsentError(error: unknown) {
  if (!(error instanceof OAuthConsentError)) return error;

  switch (error.code) {
    case "account_not_found":
      return new HTTPException(401, { message: "Account not found" });
    case "account_banned":
      return new HTTPException(403, { message: "Account is banned" });
    case "profile_incomplete":
      return new HTTPException(403, {
        message: "Profile completion required",
      });
    case "request_owned_by_another_account":
      return new HTTPException(403, {
        message: "Authorization request belongs to another account",
      });
    case "request_not_claimed":
      return new HTTPException(409, {
        message: "Authorization request must be claimed before a decision",
      });
    case "client_unavailable":
    case "request_unavailable":
      return new HTTPException(400, {
        message: "Authorization request is invalid or expired",
      });
  }
}

export default routes;
