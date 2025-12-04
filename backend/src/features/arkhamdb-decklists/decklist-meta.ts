import z from "zod";
import type { Database } from "../../db/db.ts";

export const decklistMetaResponseSchema = z.object({
  date_creation: z.date(),
  description_word_count: z.coerce.number().int().min(0),
  like_count: z.coerce.number().int().min(0),
  user_id: z.coerce.number().int().min(1),
  user_name: z.string(),
  user_reputation: z.coerce.number().int().min(0),
});

export async function getDecklistMeta(db: Database, id: number) {
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
  }

  return res;
}
