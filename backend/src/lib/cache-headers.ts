import type { Context } from "hono";
import type { HonoEnv } from "./hono-env.ts";

export type CacheResource = "cards" | "metadata" | "version";

type ApplyCacheHeadersOptions = {
  etag: string;
  resource: CacheResource;
};

export function applyCacheHeaders(
  c: Context<HonoEnv>,
  options: ApplyCacheHeadersOptions,
) {
  c.header("Cache-Control", cacheControlHeader(options.resource));
  c.header("ETag", formatEtag(options.etag));
}

export function requestHasMatchingEtag(c: Context<HonoEnv>, etag: string) {
  const ifNoneMatch = c.req.header("If-None-Match");
  if (!ifNoneMatch) return false;

  const formattedEtag = formatEtag(etag);

  return ifNoneMatch
    .split(",")
    .map((value) => value.trim())
    .some(
      (value) =>
        value === "*" || normalizeEtag(value) === normalizeEtag(formattedEtag),
    );
}

function cacheControlHeader(resource: CacheResource) {
  if (resource === "version") {
    return [
      "public",
      "max-age=0",
      "must-revalidate",
      "s-maxage=60",
      "stale-while-revalidate=60",
    ].join(", ");
  }

  return [
    "public",
    "max-age=0",
    "must-revalidate",
    "s-maxage=3600",
    "stale-while-revalidate=604800",
  ].join(", ");
}

function formatEtag(etag: string) {
  if (etag.startsWith('W/"') && etag.endsWith('"')) return etag;
  if (etag.startsWith('"') && etag.endsWith('"')) return etag;
  return `"${etag}"`;
}

function normalizeEtag(etag: string) {
  return etag.startsWith("W/") ? etag.slice(2) : etag;
}
