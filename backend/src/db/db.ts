import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Config } from "../lib/config.ts";
import type { DB } from "./schema.types.ts";

export type Database = Kysely<DB>;

export function connectionString(config: Config) {
  return `postgres://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}?sslmode=disable`;
}

export function getDatabase(connectionString: string): Database {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });
}
