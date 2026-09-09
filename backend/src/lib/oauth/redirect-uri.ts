const MAX_REDIRECT_URI_BYTES = 2048;

export function isWellFormedRedirectUri(
  uri: string | undefined,
): uri is string {
  return (
    uri != null &&
    uri.length > 0 &&
    uri === uri.trim() &&
    Buffer.byteLength(uri, "utf8") <= MAX_REDIRECT_URI_BYTES &&
    !uri.includes("#")
  );
}
