export function getLocalReturnPath(
  value: string | null | undefined,
  fallback = "/",
  origin = window.location.origin,
) {
  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function createAuthRedirectPath(path: string, returnTo: string) {
  const query = new URLSearchParams({ redirect: returnTo });
  return `${path}?${query.toString()}`;
}

export function getCurrentLocalPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
