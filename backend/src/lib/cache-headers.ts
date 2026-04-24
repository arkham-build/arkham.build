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
  c.header("Cache-Control", browserCacheControlHeader(options.resource));
  c.header(
    "Cloudflare-CDN-Cache-Control",
    cloudflareCacheControlHeader(options.resource),
  );
  c.header("Cache-Tag", "cache");
  c.header("ETag", formatWeakEtag(options.etag));
}

export function requestHasMatchingEtag(c: Context<HonoEnv>, etag: string) {
  const ifNoneMatch = c.req.header("If-None-Match");
  if (!ifNoneMatch) return false;

  const formattedEtag = formatWeakEtag(etag);

  return ifNoneMatch
    .split(",")
    .map((value) => value.trim())
    .some(
      (value) =>
        value === "*" || normalizeEtag(value) === normalizeEtag(formattedEtag),
    );
}

function browserCacheControlHeader(_resource: CacheResource) {
  return ["public", "max-age=0", "must-revalidate"].join(", ");
}

function cloudflareCacheControlHeader(_resource: CacheResource) {
  return ["public", "s-maxage=86400", "stale-while-revalidate=0"].join(", ");
}

function formatWeakEtag(etag: string) {
  if (etag.startsWith('W/"') && etag.endsWith('"')) return etag;
  if (etag.startsWith('"') && etag.endsWith('"')) return `W/${etag}`;
  return `W/"${etag}"`;
}

function normalizeEtag(etag: string) {
  return etag.startsWith("W/") ? etag.slice(2) : etag;
}
