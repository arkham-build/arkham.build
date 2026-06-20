import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HonoEnv } from "./hono-env.ts";

const DEFAULT_MAX_SIZE = 500 * 1024;
const COMPLETE_PROFILE_MAX_SIZE = 10 * 1024 * 1024;

export function bodyLimitMiddleware(): MiddlewareHandler<HonoEnv> {
  const defaultBodyLimit = createBodyLimit(DEFAULT_MAX_SIZE);
  const completeProfileBodyLimit = createBodyLimit(COMPLETE_PROFILE_MAX_SIZE);

  return (c, next) =>
    c.req.method === "POST" &&
    c.req.path === "/v2/account/auth/complete-profile"
      ? completeProfileBodyLimit(c, next)
      : defaultBodyLimit(c, next);
}

function createBodyLimit(maxSize: number): MiddlewareHandler<HonoEnv> {
  return bodyLimit({
    maxSize,
    onError: (c) => {
      c.status(413);
      return c.json({ message: "Request body is too large." });
    },
  });
}
