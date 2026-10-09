import type { Database } from "../../../db/db.ts";
import {
  generateOAuthAuthorizationRequestToken,
  hashOAuthCredential,
} from "../../../lib/oauth/crypto.ts";
import { OAuthAuthorizationError } from "./errors.ts";
import { resolveOAuthScopes } from "./scopes.ts";

export const OAUTH_AUTHORIZATION_REQUEST_LIFETIME_MS = 15 * 60 * 1000;

const MAX_STATE_BYTES = 1024;

type OAuthAuthorizationInput = {
  clientId: string;
  redirectUri: string;
  responseType: string | undefined;
  scope: string | undefined;
  state: string | undefined;
};

export async function createOAuthAuthorizationRequest(
  db: Database,
  input: OAuthAuthorizationInput,
) {
  return await db.transaction().execute(async (tx) => {
    const client = await tx
      .selectFrom("oauth_client")
      .select(["id", "disabled_at"])
      .where("id", "=", input.clientId)
      .forShare()
      .executeTakeFirst();

    if (!client) {
      throw new OAuthAuthorizationError("invalid_request", "Client is invalid");
    }

    if (client.disabled_at != null) {
      throw new OAuthAuthorizationError(
        "unauthorized_client",
        "Client is disabled",
      );
    }

    const registeredRedirectUri = await tx
      .selectFrom("oauth_client_redirect_uri")
      .select("redirect_uri")
      .where("oauth_client_id", "=", client.id)
      .where("redirect_uri", "=", input.redirectUri)
      .executeTakeFirst();

    if (!registeredRedirectUri) {
      throw new OAuthAuthorizationError(
        "invalid_request",
        "Redirect URI is invalid",
      );
    }

    const state = validateState(input.state, input.redirectUri);
    const errorRedirect = { redirectUri: input.redirectUri, state };

    if (!input.responseType) {
      throw new OAuthAuthorizationError(
        "invalid_request",
        "response_type is required",
        errorRedirect,
      );
    }

    if (input.responseType !== "code") {
      throw new OAuthAuthorizationError(
        "unsupported_response_type",
        "Only response_type=code is supported",
        errorRedirect,
      );
    }

    const scopeResult = resolveOAuthScopes(input.scope);
    if (!scopeResult.success) {
      const description =
        scopeResult.reason === "unknown_scope"
          ? "Requested scope is not supported"
          : "profile:read scope is required";
      throw new OAuthAuthorizationError(
        "invalid_scope",
        description,
        errorRedirect,
      );
    }

    const requestToken = generateOAuthAuthorizationRequestToken();
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + OAUTH_AUTHORIZATION_REQUEST_LIFETIME_MS,
    );
    await tx
      .insertInto("oauth_authorization_request")
      .values({
        expires_at: expiresAt,
        oauth_client_id: client.id,
        redirect_uri: registeredRedirectUri.redirect_uri,
        request_token_hash: hashOAuthCredential(requestToken),
        scopes: scopeResult.scopes,
        state,
      })
      .execute();

    return {
      canonicalScopes: scopeResult.canonicalScopes,
      expiresAt,
      requestToken,
    };
  });
}

function validateState(state: string | undefined, redirectUri: string) {
  if (!state || Buffer.byteLength(state, "utf8") > MAX_STATE_BYTES) {
    throw new OAuthAuthorizationError(
      "invalid_request",
      "State is required and must be at most 1024 bytes",
      { redirectUri },
    );
  }

  return state;
}
