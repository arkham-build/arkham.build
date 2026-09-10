import { STATUS_CODES } from "node:http";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { ApiError } from "./arkhamdb/api-client/core/errors.ts";
import type { HonoEnv } from "./hono-env.ts";

export function errorHandler(err: unknown, c: Context<HonoEnv>) {
  if (err instanceof ApiError) {
    return c.json(
      {
        message: err.message,
      },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof HTTPException) {
    const body = formatError(err);
    if (err.status === 400) logBadRequest(c, body);
    return c.json(body, err.status);
  }

  if (err instanceof ZodError) {
    const body = {
      message: "Validation Error",
      cause: formatErrorCause(err),
    };
    logBadRequest(c, body);
    return c.json(body, 400);
  }

  const config = c.get("config");
  const logger = c.get("logger");

  if (config.NODE_ENV === "production") {
    logger("error", "Internal server error", {
      error: (err as Error)?.message,
    });
  } else {
    console.error(err);
  }

  return c.json({ message: STATUS_CODES[500] as string }, 500);
}

function logBadRequest(
  c: Context<HonoEnv>,
  body: { message: string; cause?: unknown },
) {
  c.get("logger")("warn", "Bad request", {
    method: c.req.method,
    path: c.req.path,
    error: body.message,
    cause: body.cause,
  });
}

function formatError(err: HTTPException & { cause?: unknown }) {
  return {
    message: err.message || (STATUS_CODES[err.status] as string),
    cause: formatErrorCause(err.cause),
  };
}

function formatErrorCause(cause: unknown) {
  if (cause instanceof ZodError) return cause.issues;
  if (cause instanceof Error) return cause.message;
  if (cause != null && typeof cause === "object") return cause;
  return undefined;
}
