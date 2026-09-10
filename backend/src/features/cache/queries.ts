import type { Database } from "../../db/db.ts";

export function getDataVersionByLocale(db: Database, locale: string) {
  return db
    .selectFrom("data_version")
    .selectAll()
    .where("locale", "=", locale)
    .executeTakeFirstOrThrow();
}
