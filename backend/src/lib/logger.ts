import type { Context, Next } from "hono";
import type { HonoEnv } from "./hono-env.ts";

type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = (
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>,
) => void;

export const log: Logger = (
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>,
) => {
  // oxlint-disable-next-line no-console -- logger utility
  console.log(
    JSON.stringify(
      {
        level,
        message,
        details: details ?? {},
        timestamp: new Date().toISOString(),
      },
      redactSensitiveLogValue,
    ),
  );
};

export function logger() {
  return (c: Context<HonoEnv>, next: Next) => {
    const requestId = c.get("requestId");
    const clientId = c.req.header("X-Client-Id");

    const logger: Logger = (level, message, _details) => {
      const details = _details ?? {};
      details["request_id"] = requestId;
      details["client_id"] = clientId;
      log(level, message, details);
    };

    c.set("logger", logger);

    return next();
  };
}

export function requestLogger() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const begin = Date.now();

    await next();

    // don't log successful health checks
    if (c.req.path !== "/version" || c.res.status !== 200) {
      const safePath = redactSensitiveText(c.req.path);
      const details: Record<string, unknown> = {
        level: "info",
        duration_ms: Date.now() - begin,
        method: c.req.method,
        status: c.res.status,
        url: safePath,
      };

      if (isPublicShareRequest(c)) {
        details["client_ip"] = clientIp(c);
      }

      c.get("logger")("info", `${c.req.method} ${safePath}`, details);
    }
  };
}

function redactSensitiveLogValue(_key: string, value: unknown) {
  if (typeof value !== "string") return value;
  return redactSensitiveText(value);
}

function redactSensitiveText(value: string) {
  return value
    .replace(
      /(\/v2\/account\/oauth\/authorization-requests\/)[^/?#\s]+/g,
      "$1:token",
    )
    .replace(/ab_ar_[A-Za-z0-9_-]{43}/g, ":token");
}

function isPublicShareRequest(c: Context<HonoEnv>) {
  return c.req.method === "GET" && c.req.path.startsWith("/v1/public/share");
}

function clientIp(c: Context<HonoEnv>) {
  return (
    header(c, "CF-Connecting-IP") ??
    header(c, "True-Client-IP") ??
    forwardedFor(c) ??
    header(c, "X-Real-IP")
  );
}

function forwardedFor(c: Context<HonoEnv>) {
  return c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || undefined;
}

function header(c: Context<HonoEnv>, name: string) {
  return c.req.header(name)?.trim() || undefined;
}
