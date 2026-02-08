import type { FanMadeProjectInfo } from "@arkham-build/shared";
import type { Database } from "../db.ts";

export function getAllFanMadeProjectInfos(db: Database) {
  return db.selectFrom("fan_made_project_info").selectAll().execute();
}

export function getFanMadeProjectInfo(db: Database, id: string) {
  return db
    .selectFrom("fan_made_project_info")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
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
