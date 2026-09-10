import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import type { Config } from "../config.ts";

export function setSessionCookie(c: Context, sessionId: string): void {
  const config = c.get("config") as Config;

  setCookie(c, config.SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: config.SESSION_EXPIRY_HOURS * 60 * 60,
    path: "/",
  });
}
