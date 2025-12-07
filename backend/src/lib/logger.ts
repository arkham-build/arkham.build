import type { Context, Next } from "hono";
import type { HonoEnv } from "./hono-env.ts";

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogMessage = {
  level: LogLevel;
  message: string;
  details?: {
    [key: string]: unknown;
  };
};

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
  // biome-ignore lint/suspicious/noConsole: logger utility
  console.log(
    JSON.stringify({
      level,
      message,
      details: details ?? {},
      timestamp: new Date().toISOString(),
    }),
  );
};

export function logger() {
  return (c: Context<HonoEnv>, next: Next) => {
    const requestId = c.get("requestId");
    const clientId = c.header("X-Client-Id");

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
      c.get("logger")("info", `${c.req.method} ${c.req.path}`, {
        level: "info",
        duration_ms: Date.now() - begin,
        method: c.req.method,
        status: c.res.status,
        url: c.req.url,
      });
    }
  };
}
