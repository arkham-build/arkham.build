import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { SessionAuthHonoEnv } from "../hono-env.ts";
import { assertAccountNotBanned } from "./account-moderation-actions.ts";
import { findAccountForAuth } from "./accounts.ts";
import { setSessionCookie } from "./session-cookie.ts";
import { getSession, updateSessionActivity } from "./sessions.ts";

export function sessionAuth(): MiddlewareHandler<SessionAuthHonoEnv> {
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

    const account = await findAccountForAuth(db, session.account_id);

    if (!account) {
      throw new HTTPException(401, { message: "Account not found" });
    }

    assertAccountNotBanned(account);
    await updateSessionActivity(db, sessionId, config.SESSION_EXPIRY_HOURS);

    c.set("session", session);
    c.set("account", account);

    await next();

    if (!c.get("skipSessionCookieRefresh")) {
      setSessionCookie(c, session.id);
    }
  };
}
