import { OAUTH_SCOPES, type OAuthScope } from "@arkham-build/shared";

const OAUTH_SCOPE_SET = new Set<string>(OAUTH_SCOPES);

export type OAuthScopeValidationResult =
  | { success: true; scopes: OAuthScope[]; canonicalScopes: string }
  | {
      success: false;
      reason: "profile_read_required" | "unknown_scope";
    };

export function resolveOAuthScopes(
  requestedScopes: string | undefined,
): OAuthScopeValidationResult {
  const requestedScopeList = requestedScopes?.trim().split(/\s+/) ?? [];

  const effectiveScopes = new Set<OAuthScope>();
  for (const scope of requestedScopeList) {
    if (!isOAuthScope(scope)) {
      return { success: false, reason: "unknown_scope" };
    }

    effectiveScopes.add(scope);
  }
  if (!effectiveScopes.has("profile:read")) {
    return { success: false, reason: "profile_read_required" };
  }

  if (effectiveScopes.has("decks:delete")) {
    effectiveScopes.add("decks:write");
  }

  if (effectiveScopes.has("decks:write")) {
    effectiveScopes.add("decks:read");
  }

  const scopes = OAUTH_SCOPES.filter((scope) => effectiveScopes.has(scope));
  return {
    success: true,
    scopes,
    canonicalScopes: scopes.join(" "),
  };
}

export function canonicalizeOAuthScopes(
  scopes: readonly string[],
): OAuthScope[] {
  for (const scope of scopes) {
    if (!isOAuthScope(scope)) {
      throw new Error("Stored OAuth grant contains an unsupported scope");
    }
  }

  const scopeSet = new Set(scopes);
  return OAUTH_SCOPES.filter((scope) => scopeSet.has(scope));
}

function isOAuthScope(scope: string): scope is OAuthScope {
  return OAUTH_SCOPE_SET.has(scope);
}
