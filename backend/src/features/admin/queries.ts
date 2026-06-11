import type { FanMadeProjectInfo } from "@arkham-build/shared";
import type { Database } from "../../db/db.ts";
import type { ModerationActionType } from "../../db/schema.types.ts";

export async function findAppDataVersions(db: Database) {
  const [rankingCache, dataVersion] = await Promise.all([
    db
      .selectFrom("arkhamdb_ranking_cache")
      .select("updated_at")
      .limit(1)
      .executeTakeFirst(),
    db
      .selectFrom("data_version")
      .select(["cards_updated_at", "card_count"])
      .where("locale", "=", "en")
      .executeTakeFirst(),
  ]);

  if (!rankingCache || !dataVersion) {
    return undefined;
  }

  return {
    arkhamdb_data_updated_at: rankingCache.updated_at,
    metadata_updated_at: dataVersion.cards_updated_at,
    card_count: dataVersion.card_count,
  };
}

export async function findAccountModerationActionById(
  db: Database,
  id: string,
) {
  return await db
    .selectFrom("account_moderation_action")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function listAccountModerationActionsByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("account_moderation_action")
    .selectAll()
    .where("account_id", "=", accountId)
    .orderBy("created_at", "desc")
    .execute();
}

export function createAccountModerationAction(
  db: Database,
  accountId: string,
  type: ModerationActionType,
  reason: string,
  endsAt?: Date,
  endReason?: string,
) {
  return db
    .insertInto("account_moderation_action")
    .values({
      account_id: accountId,
      scope: "account",
      type,
      reason,
      ends_at: endsAt,
      end_reason: endReason,
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();
}

export async function endAccountModerationAction(
  db: Database,
  id: string,
  endsAt: Date,
  endReason: string,
) {
  return await db
    .updateTable("account_moderation_action")
    .set({
      ends_at: endsAt,
      end_reason: endReason,
    })
    .where("id", "=", id)
    .returning(["id", "ends_at", "end_reason"])
    .executeTakeFirstOrThrow();
}

export function upsertFanMadeProjectInfo(
  db: Database,
  listing: Omit<FanMadeProjectInfo, "id">,
) {
  const id = listing.meta.code;

  return db
    .insertInto("fan_made_project_info")
    .values({
      id,
      bucket_path: listing.bucket_path,
      meta: JSON.stringify(listing.meta),
    })
    .onConflict((oc) =>
      oc.column("id").doUpdateSet({
        bucket_path: (eb) => eb.ref("excluded.bucket_path"),
        meta: (eb) => eb.ref("excluded.meta"),
      }),
    )
    .execute();
}
