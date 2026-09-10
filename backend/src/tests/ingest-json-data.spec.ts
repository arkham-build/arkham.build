import { expect } from "vitest";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

const TABOO_SET_ID = 999;

test("ingesting taboo sets preserves deck references", async ({
  dependencies,
}) => {
  const account = await dependencies.db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();

  await dependencies.db
    .insertInto("taboo_set")
    .values({
      card_count: 1,
      code: "old",
      date_start: new Date("2026-01-01"),
      id: TABOO_SET_ID,
      name: "Old",
    })
    .execute();

  await dependencies.db
    .insertInto("deck")
    .values({
      account_id: account.id,
      id: "taboo-ingest-test",
      investigator_code: "01001",
      investigator_name: "Roland Banks",
      name: "Taboo ingest test",
      provider_type: "account",
      slots: { "01001": 1 },
      taboo_set_id: TABOO_SET_ID,
      version: "1.0",
    })
    .execute();

  await dependencies.db.transaction().execute(async (tx) => {
    await tx.deleteFrom("taboo_set").where("id", "=", TABOO_SET_ID).execute();
    await tx
      .insertInto("taboo_set")
      .values({
        card_count: 2,
        code: "updated",
        date_start: new Date("2026-02-01"),
        id: TABOO_SET_ID,
        name: "Updated",
      })
      .execute();
  });

  const deck = await dependencies.db
    .selectFrom("deck")
    .select("taboo_set_id")
    .where("id", "=", "taboo-ingest-test")
    .executeTakeFirstOrThrow();
  expect(deck.taboo_set_id).toBe(TABOO_SET_ID);

  const tabooSet = await dependencies.db
    .selectFrom("taboo_set")
    .select(["card_count", "code", "name"])
    .where("id", "=", TABOO_SET_ID)
    .executeTakeFirstOrThrow();
  expect(tabooSet).toEqual({
    card_count: 2,
    code: "updated",
    name: "Updated",
  });

  await expect(
    dependencies.db.transaction().execute(async (tx) => {
      await tx.deleteFrom("taboo_set").where("id", "=", TABOO_SET_ID).execute();
    }),
  ).rejects.toThrow('violates foreign key constraint "deck_taboo_set_id_fkey"');
});
