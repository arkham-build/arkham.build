import assert from "node:assert";

const OAUTH_PROVIDERS = ["arkhamdb", "steam"] as const;

export type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

const LOGIN_OAUTH_PROVIDERS = [
  "arkhamdb",
] as const satisfies readonly OAuthProviderName[];

type LoginOAuthProviderName = (typeof LOGIN_OAUTH_PROVIDERS)[number];

export function assertKnownOAuthProvider(
  provider: string,
): asserts provider is OAuthProviderName {
  assert(isKnownOAuthProvider(provider), `Unknown OAuth provider: ${provider}`);
}

export function assertLoginOAuthProvider(
  provider: string,
): asserts provider is LoginOAuthProviderName {
  assertKnownOAuthProvider(provider);
  assert(
    isLoginOAuthProvider(provider),
    `OAuth provider cannot log in: ${provider}`,
  );
}

export function canDisconnectOAuthIdentity(
  provider: string,
  usableLoginIdentityCount: number,
) {
  assertKnownOAuthProvider(provider);

  return isLoginOAuthProvider(provider)
    ? usableLoginIdentityCount > 1
    : usableLoginIdentityCount > 0;
}

export function getLoginOAuthProviders(): OAuthProviderName[] {
  return [...LOGIN_OAUTH_PROVIDERS];
}

export function isKnownOAuthProvider(
  provider: string,
): provider is OAuthProviderName {
  return OAUTH_PROVIDERS.some((knownProvider) => knownProvider === provider);
}

function isLoginOAuthProvider(
  provider: OAuthProviderName,
): provider is LoginOAuthProviderName {
  return LOGIN_OAUTH_PROVIDERS.some(
    (loginProvider) => loginProvider === provider,
  );
}
