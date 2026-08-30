import { z } from "zod";
import { OAuthErrorCodeSchema, OAuthErrorResponseSchema } from "../dtos.ts";

const OAuthAuthorizationErrorCodeSchema = z.enum([
  "invalid_request",
  "invalid_scope",
  "unauthorized_client",
  "unsupported_response_type",
]);

type OAuthAuthorizationErrorCode = z.infer<
  typeof OAuthAuthorizationErrorCodeSchema
>;

type OAuthErrorCode = z.infer<typeof OAuthErrorCodeSchema>;

export type OAuthTokenErrorCode = Exclude<
  OAuthErrorCode,
  "unsupported_response_type"
>;

type OAuthErrorRedirect = {
  redirectUri: string;
  state?: string | undefined;
};

export class OAuthAuthorizationError extends Error {
  readonly code: OAuthAuthorizationErrorCode;
  readonly description: string;
  readonly redirect: OAuthErrorRedirect | undefined;

  constructor(
    code: OAuthAuthorizationErrorCode,
    description: string,
    redirect?: OAuthErrorRedirect,
  ) {
    super(code);
    this.name = "OAuthAuthorizationError";
    this.code = code;
    this.description = description;
    this.redirect = redirect;
  }
}

export class OAuthTokenError extends Error {
  readonly code: OAuthTokenErrorCode;
  readonly description: string;
  readonly status: 400 | 401;

  constructor(
    code: OAuthTokenErrorCode,
    description: string,
    status: 400 | 401 = 400,
  ) {
    super(code);
    this.name = "OAuthTokenError";
    this.code = code;
    this.description = description;
    this.status = status;
  }
}

export function encodeOAuthError(
  error: OAuthAuthorizationError | OAuthTokenError,
) {
  return OAuthErrorResponseSchema.parse({
    error: error.code,
    error_description: error.description,
  });
}

export function createOAuthErrorRedirectUrl(
  redirect: OAuthErrorRedirect,
  error: OAuthAuthorizationError,
) {
  const redirectUrl = new URL(redirect.redirectUri);
  redirectUrl.searchParams.set("error", error.code);
  redirectUrl.searchParams.set("error_description", error.description);

  if (!redirect.state) {
    redirectUrl.searchParams.delete("state");
  } else {
    redirectUrl.searchParams.set("state", redirect.state);
  }

  return redirectUrl.toString();
}
