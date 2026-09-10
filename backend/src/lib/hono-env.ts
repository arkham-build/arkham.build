import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type { Account, Session } from "../db/schema.types.ts";
import type { JobDispatcher } from "../jobs/dispatcher.ts";
import type { Config } from "./config.ts";
import type { Logger } from "./logger.ts";

export type HonoVariables = {
  config: Config;
  db: Database;
  dispatcher: JobDispatcher;
  logger: Logger;
  session?: Selectable<Session>;
  account?: Selectable<Account>;
  skipSessionCookieRefresh?: boolean;
};

export type HonoEnv = {
  Variables: HonoVariables;
};

export type WithRequiredHonoVariableKeys<K extends keyof HonoVariables> = {
  Variables: Omit<HonoVariables, K> & {
    [P in K]-?: NonNullable<HonoVariables[P]>;
  };
};

export type SessionAuthHonoEnv = WithRequiredHonoVariableKeys<
  "account" | "session"
>;
