import { STATUS_CODES } from "node:http";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { HonoEnv } from "./hono-env.ts";

export function errorHandler(err: unknown, c: Context<HonoEnv>) {
  if (err instanceof HTTPException) {
    return c.json(formatError(err), err.status);
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        message: "Validation Error",
        cause: formatErrorCause(err),
      },
      400,
    );
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
