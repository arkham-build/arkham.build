import assert from "node:assert";
import type { Context } from "hono";
import type { HonoEnv } from "../hono-env.ts";

export function authenticatedAccountId<E extends HonoEnv>(c: Context<E>) {
  const accountId = c.get("oauthBearer")?.account.id ?? c.get("account")?.id;
  assert(accountId, "Missing authenticated account context.");
  return accountId;
}
