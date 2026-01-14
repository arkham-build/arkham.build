import type { Database } from "../db.ts";

export interface CreateAccountParams {
  name: string;
  email: string;
  passwordHash: string;
}

export async function createAccount(db: Database, params: CreateAccountParams) {
  return await db.transaction().execute(async (trx) => {
    const account = await trx
      .insertInto("account")
      .values({ name: params.name })
      .returningAll()
      .executeTakeFirstOrThrow();

    const accountIdentity = await trx
      .insertInto("account_identity")
      .values({
        account_id: account.id,
        provider: "email",
        provider_user_id: params.email,
        email: params.email,
        password_hash: params.passwordHash,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { account, accountIdentity };
  });
}

export async function getAccount(db: Database, id: string) {
  return await db
    .selectFrom("account")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}
