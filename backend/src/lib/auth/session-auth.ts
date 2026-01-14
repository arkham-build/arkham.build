import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { getAccount } from "../../db/queries/account.ts";
import { getSession, updateSessionActivity } from "../../db/queries/session.ts";
import type { HonoEnv } from "../hono-env.ts";

export function sessionAuth(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const config = c.get("config");
    const db = c.get("db");

    const sessionId = getCookie(c, config.SESSION_COOKIE_NAME);

    if (!sessionId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const session = await getSession(db, sessionId);

    if (!session) {
      throw new HTTPException(401, { message: "Invalid or expired session" });
    }

    const account = await getAccount(db, session.account_id);

    if (!account) {
      throw new HTTPException(401, { message: "Account not found" });
    }

    await updateSessionActivity(db, sessionId, config.SESSION_EXPIRY_HOURS);

    c.set("session", session);
    c.set("account", account);

    await next();
  };
}
