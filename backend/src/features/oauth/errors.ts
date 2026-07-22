import { z } from "@hono/zod-openapi";

export const OAuthAuthorizationErrorCodeSchema = z.enum([
  "invalid_request",
  "unauthorized_client",
  "unsupported_response_type",
  "invalid_scope",
]);

export const OAuthErrorResponseSchema = z
  .object({
    error: OAuthAuthorizationErrorCodeSchema,
    error_description: z.string(),
  })
  .strict()
  .openapi("OAuthError");

type OAuthAuthorizationErrorCode = z.infer<
  typeof OAuthAuthorizationErrorCodeSchema
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

export function encodeOAuthError(error: OAuthAuthorizationError) {
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
