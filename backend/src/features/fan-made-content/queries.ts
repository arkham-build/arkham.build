import type { Database } from "../../db/db.ts";

export function listFanMadeProjectInfos(db: Database) {
  return db.selectFrom("fan_made_project_info").selectAll().execute();
}

export function findFanMadeProjectInfoById(db: Database, id: string) {
  return db
    .selectFrom("fan_made_project_info")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}
