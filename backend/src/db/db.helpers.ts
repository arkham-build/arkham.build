import fs from "node:fs";
import path from "node:path";
import { sql } from "kysely";
import type { Database } from "./db.ts";

/**
 * Applies all SQL files in the specified folder to the database.
 * TESTING and SCRIPTS use only.
 */
export async function applySqlFiles(db: Database, pathToFolder: string) {
  const folderPath = path.join(import.meta.dirname, pathToFolder);
  const folder = await fs.promises.readdir(folderPath);

  for (const fileName of folder) {
    if (!fileName.endsWith(".sql")) continue;
    const filePath = path.join(folderPath, fileName);
    let sqlText = await fs.promises.readFile(filePath, "utf-8");

    if (sqlText.includes("-- migrate:up")) {
      sqlText = sqlText.split("-- migrate:down")[0] as string;
    }

    await db.executeQuery(sql.raw(sqlText).compile(db));
  }
}
