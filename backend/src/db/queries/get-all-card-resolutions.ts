import type { Database } from "../db.ts";

export function getAllCardResolutions(db: Database) {
  return db.selectFrom("card_resolution").selectAll().execute();
}
