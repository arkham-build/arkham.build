import type { Database } from "../../db/db.ts";
import type { AccountFolder } from "../../db/schema.types.ts";

export async function findAccountFolderStateByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("account_folder")
    .select(["state", "revision"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

export async function upsertAccountFolderState(
  db: Database,
  accountId: string,
  revision: string,
  state: AccountFolder["state"],
) {
  return await db
    .insertInto("account_folder")
    .values({
      account_id: accountId,
      revision,
      state,
    })
    .onConflict((oc) =>
      oc.column("account_id").doUpdateSet({
        revision,
        state,
      }),
    )
    .returning(["state", "revision"])
    .executeTakeFirstOrThrow();
}
