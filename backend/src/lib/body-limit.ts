import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HonoEnv } from "./hono-env.ts";

const DEFAULT_MAX_SIZE = 1 * 1024 * 1024;
const LARGE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;

const BODY_LIMIT_RULES = [
  {
    method: "POST",
    path: "/v2/account/auth/complete-profile",
    maxSize: LARGE_UPLOAD_MAX_SIZE,
  },
  {
    method: "POST",
    path: "/admin/account_backup/restore",
    maxSize: LARGE_UPLOAD_MAX_SIZE,
  },
] as const;

export function bodyLimitMiddleware(): MiddlewareHandler<HonoEnv> {
  const defaultBodyLimit = createBodyLimit(DEFAULT_MAX_SIZE);
  const bodyLimitRules = BODY_LIMIT_RULES.map((rule) => ({
    ...rule,
    middleware: createBodyLimit(rule.maxSize),
  }));

  return (c, next) => {
    const rule = bodyLimitRules.find(
      (rule) => c.req.method === rule.method && c.req.path === rule.path,
    );

    return (rule?.middleware ?? defaultBodyLimit)(c, next);
  };
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
