import type { Context } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type { HonoEnv } from "../../lib/hono-env.ts";

export const adminKeyMiddleware = bearerAuth({
  verifyToken: (token, c: Context<HonoEnv>) =>
    token === c.get("config").ADMIN_API_KEY,
});
