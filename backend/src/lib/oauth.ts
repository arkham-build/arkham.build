import {
  OAUTH_FLOW_ERROR_CODES,
  type OAuthFlowErrorCode,
} from "@arkham-build/shared";
import type { Context } from "hono";
import type { OAuthAccessToken as ArkhamOAuthAccessToken } from "./arkhamdb/api-client/api-oauth.ts";
import type { ArkhamDbRemoteDeck } from "./arkhamdb/api-client/core/dtos.ts";

// use arkhamdb format as canonical
export type OAuthAccessToken = ArkhamOAuthAccessToken;

export type OAuthProviderIdentity = {
  initialArkhamDbDeckSnapshot?: {
    decks: ArkhamDbRemoteDeck[];
    lastModified: string | null;
  };
  providerUserId: string;
};

export type OAuthProvider = {
  name: string;
  getAuthorizationUrl(c: Context, state: string): string;
  getCallbackPath(c: Context): string;
  exchangeCodeForToken(c: Context, code: string): Promise<OAuthAccessToken>;
  getIdentity(
    c: Context,
    accessToken: OAuthAccessToken,
  ): Promise<OAuthProviderIdentity>;
};

export class OAuthFlowError extends Error {
  code: OAuthFlowErrorCode;

  constructor(code: string, cause?: unknown) {
    super(code);
    this.name = "OAuthFlowError";
    this.code = this.mapToOAuthFlowErrorCode(code);

    if (cause !== undefined) {
      this.cause = cause;
      if (cause instanceof Error && cause.stack) {
        this.stack = cause.stack;
      }
    }
  }

  mapToOAuthFlowErrorCode(code: string): OAuthFlowErrorCode {
    if (OAUTH_FLOW_ERROR_CODES.has(code)) {
      return code as OAuthFlowErrorCode;
    }

    return "oauth_failed" as OAuthFlowErrorCode;
  }
}
