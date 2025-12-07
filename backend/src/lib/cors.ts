import { cors } from "hono/cors";
import type { Config } from "./config.ts";

export function corsMiddleware(config: Config) {
  const allowedOrigins = config.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return cors({
    allowMethods: ["DELETE", "GET", "PATCH", "POST", "PUT"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "If-Modified-Since",
      "X-Client-Id",
    ],
    credentials: true,
    maxAge: 600,
    origin(origin: string) {
      const matches = allowedOrigins.some((allowed) =>
        originMatches(allowed, origin),
      );
      return matches ? origin : null;
    },
  });
}

function originMatches(allowed: string, origin: string): boolean {
  return (
    // direct match
    allowed === origin ||
    // wildcard match
    (allowed.startsWith("*") && origin.endsWith(allowed.slice(1)))
  );
}
