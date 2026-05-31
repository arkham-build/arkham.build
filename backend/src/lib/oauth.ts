import type { Context } from "hono";

export type OAuthAccessToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string | null;
  refresh_token: string;
};

export type OAuthProviderIdentity = {
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
  code: string;

  constructor(code: string, cause?: unknown) {
    super(code);
    this.name = "OAuthFlowError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
      if (cause instanceof Error && cause.stack) {
        this.stack = cause.stack;
      }
    }
  }
}
