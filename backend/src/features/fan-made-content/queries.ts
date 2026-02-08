import type { Database } from "../../db/db.ts";

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
