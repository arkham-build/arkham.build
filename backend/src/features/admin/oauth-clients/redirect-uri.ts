import { isWellFormedRedirectUri } from "../../../lib/oauth/redirect-uri.ts";

const URI_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+.-]*):/;
const DANGEROUS_SCHEMES = new Set([
  "about",
  "blob",
  "data",
  "file",
  "javascript",
  "vbscript",
]);

export function isValidOAuthRedirectUri(value: string) {
  if (!isWellFormedRedirectUri(value)) {
    return false;
  }

  const schemeMatch = URI_SCHEME_PATTERN.exec(value);
  const sourceScheme = schemeMatch?.[1];
  if (!sourceScheme) return false;

  let redirectUri: URL;
  try {
    redirectUri = new URL(value);
  } catch {
    return false;
  }

  const scheme = sourceScheme.toLowerCase();
  if (
    redirectUri.protocol !== `${scheme}:` ||
    !!redirectUri.username ||
    !!redirectUri.password ||
    DANGEROUS_SCHEMES.has(scheme)
  ) {
    return false;
  }

  if (scheme === "https") {
    return hasAuthorityPrefix(value, sourceScheme) && !!redirectUri.hostname;
  }

  if (scheme === "http") {
    return (
      hasAuthorityPrefix(value, sourceScheme) &&
      redirectUri.hostname === "localhost"
    );
  }

  return true;
}

function hasAuthorityPrefix(value: string, sourceScheme: string) {
  return value.slice(sourceScheme.length + 1).startsWith("//");
}
