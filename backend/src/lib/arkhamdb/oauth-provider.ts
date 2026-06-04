import type { Context } from "hono";
import { OAuthFlowError, type OAuthProvider } from "../oauth.ts";
import {
  exchangeAuthCodeForToken,
  fetchDecksForOAuthUser,
} from "./api-client/api-oauth.ts";
import type { ArkhamDbRemoteDeck } from "./api-client/core/dtos.ts";

function getOAuthConfig(c: Context) {
  const config = c.get("config");

  return {
    base: `${config.ARKHAMDB_BASE_URL}/oauth/v2`,
    redirectUri: config.ARKHAMDB_OAUTH_REDIRECT_URI,
    clientId: config.ARKHAMDB_OAUTH_CLIENT_ID,
  };
}

export const arkhamdbOAuthProvider: OAuthProvider = {
  name: "arkhamdb",
  getAuthorizationUrl(c, state) {
    const config = getOAuthConfig(c);
    const url = new URL(`${config.base}/auth`);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  },
  getCallbackPath(c) {
    return new URL(getOAuthConfig(c).redirectUri).pathname;
  },
  async exchangeCodeForToken(c, code) {
    try {
      const token = await exchangeAuthCodeForToken(c, code);
      return token;
    } catch (error) {
      c.get("logger")("error", (error as Error).message);
      throw new OAuthFlowError("arkhamdb_invalid_response");
    }
  },
  async getIdentity(c, accessToken) {
    let decks: ArkhamDbRemoteDeck[];

    try {
      const res = await fetchDecksForOAuthUser({
        context: c,
        accessToken,
      });
      decks = res.data;
    } catch (error) {
      c.get("logger")("error", (error as Error).message);
      throw new OAuthFlowError("arkhamdb_invalid_response");
    }

    if (!decks.length) {
      throw new OAuthFlowError("arkhamdb_no_decks");
    }

    const firstDeck = decks[0];

    if (!firstDeck?.user_id) {
      throw new OAuthFlowError("arkhamdb_invalid_response");
    }

    return {
      providerUserId: firstDeck.user_id.toString(),
    };
  },
};
