import {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "@arkham-build/shared";
import type { Database } from "../../db/db.ts";

export async function getDecklistMeta(
  db: Database,
  id: number,
): Promise<DecklistMetaResponse | undefined> {
  const res = await db
    .selectFrom("arkhamdb_decklist")
    .innerJoin("arkhamdb_user", "arkhamdb_user.id", "arkhamdb_decklist.user_id")
    .select([
      "date_creation",
      "like_count",
      "user_id",
      "description_word_count",
      "arkhamdb_user.name as user_name",
      "arkhamdb_user.reputation as user_reputation",
    ])
    .where("arkhamdb_decklist.id", "=", id)
    .executeTakeFirst();

  if (!res) {
    return undefined;
  }

  return DecklistMetaResponseSchema.parse(res);
}
