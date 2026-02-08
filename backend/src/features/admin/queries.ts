import type { FanMadeProjectInfo } from "@arkham-build/shared";
import type { Database } from "../../db/db.ts";

export async function getAppDataVersions(db: Database) {
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
