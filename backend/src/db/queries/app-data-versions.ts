import type { Database } from "../db.ts";

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
