import type { Transaction } from "kysely";
import type { DB } from "../../../db/schema.types.ts";

type SyncDataVersionsOpts = {
  locales: string[];
  sha: string;
  cardCount: number;
};

export async function syncDataVersions(
  tx: Transaction<DB>,
  opts: SyncDataVersionsOpts,
) {
  const { locales, sha, cardCount } = opts;
  const now = new Date();
  const versions = Array.from(new Set(locales)).map((locale) => ({
    card_count: cardCount,
    cards_updated_at: now,
    ingested_commit_id: sha,
    locale,
    translation_updated_at: now,
  }));

  for (const version of versions) {
    await tx
      .insertInto("data_version")
      .values(version)
      .onConflict((oc) =>
        oc.column("locale").doUpdateSet({
          card_count: version.card_count,
          cards_updated_at: version.cards_updated_at,
          ingested_commit_id: version.ingested_commit_id,
          translation_updated_at: version.translation_updated_at,
        }),
      )
      .execute();
  }
}
