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
    const sqlText = sanitizeSqlFile(
      await fs.promises.readFile(filePath, "utf-8"),
    );

    await db.executeQuery(sql.raw(sqlText).compile(db));
  }
}

/**
 * Serialize objects to format that the postgres npm library can handle.
 */
export function serializeRecords<T extends object>(
  data: ReadonlyArray<object>,
): T[] {
  return data.map((row) => {
    const serializedRow: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "object" && value != null) {
        serializedRow[key] = JSON.stringify(value);
      } else {
        serializedRow[key] = value ?? null;
      }
    }

    return serializedRow as T;
  });
}

function sanitizeSqlFile(sqlText: string) {
  let sanitized = sqlText;

  if (sanitized.includes("-- migrate:up")) {
    sanitized = sanitized.split("-- migrate:down")[0] as string;
  }

  return sanitized
    .split("\n")
    .filter((line) => !line.startsWith("\\"))
    .filter((line) => line !== "SET transaction_timeout = 0;")
    .join("\n");
}
