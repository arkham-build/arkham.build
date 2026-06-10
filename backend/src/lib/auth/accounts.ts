import type { Selectable } from "kysely";
import type { Database } from "../../db/db.ts";
import type { Account } from "../../db/schema.types.ts";

export type AuthAccount = Selectable<Account> & {
  active_account_ban_id: string | null;
};

export async function deleteAccountById(db: Database, id: string) {
  return await db.deleteFrom("account").where("id", "=", id).executeTakeFirst();
}

export async function findAccountForAuth(
  db: Database,
  id: string,
): Promise<AuthAccount | undefined> {
  const now = new Date();

  return await db
    .selectFrom("account")
    .leftJoin("account_moderation_action", (join) =>
      join
        .onRef("account_moderation_action.account_id", "=", "account.id")
        .on("account_moderation_action.scope", "=", "account")
        .on("account_moderation_action.type", "=", "ban")
        .on("account_moderation_action.created_at", "<=", now)
        .on((eb) =>
          eb.or([
            eb("account_moderation_action.ends_at", "is", null),
            eb("account_moderation_action.ends_at", ">", now),
          ]),
        ),
    )
    .selectAll("account")
    .select("account_moderation_action.id as active_account_ban_id")
    .where("account.id", "=", id)
    .executeTakeFirst();
}
