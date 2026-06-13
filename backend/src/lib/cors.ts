import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import type { Config } from "./config.ts";

const CORS_PARAMS = {
  allowMethods: ["DELETE", "GET", "PATCH", "POST", "PUT"],
  allowHeaders: [
    "Authorization",
    "Content-Type",
    "If-Modified-Since",
    "If-None-Match",
    "X-Client-Id",
  ],
  maxAge: 600,
};

export function publicCorsMiddleware(config: Config): MiddlewareHandler {
  const origin = createOriginMatcher(config);

  return (ctx, next) => {
    const wrapped = cors({
      ...CORS_PARAMS,
      origin:
        ctx.req.method === "GET" && ctx.req.path.startsWith("/v1/public/share")
          ? "*"
          : origin,
    });

    return wrapped(ctx, next);
  };
}

export function authenticatedCorsMiddleware(config: Config): MiddlewareHandler {
  return cors({
    ...CORS_PARAMS,
    credentials: true,
    origin: createOriginMatcher(config),
  });
}

function createOriginMatcher(config: Config) {
  const allowedOrigins = config.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return (origin: string) => {
    const matches = allowedOrigins.some((allowed) =>
      originMatches(allowed, origin),
    );
    return matches ? origin : null;
  };
}

function originMatches(allowed: string, origin: string): boolean {
  return (
    allowed === origin ||
    (allowed.startsWith("*.") && origin.endsWith(allowed.slice(1)))
  );
}
