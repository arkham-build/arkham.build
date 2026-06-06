import { HTTPException } from "hono/http-exception";
import type { AuthAccount } from "./accounts.ts";

export function assertAccountNotBanned(account: AuthAccount) {
  if (account.active_account_ban_id) {
    throw new HTTPException(403, { message: "Account is banned" });
  }
}
