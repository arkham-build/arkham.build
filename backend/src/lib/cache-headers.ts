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
  c.header("ETag", options.etag);
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
    "s-maxage=86400",
    "stale-while-revalidate=604800",
  ].join(", ");
}
