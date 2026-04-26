import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type { Account, Session } from "../db/schema.types.ts";
import type { Config } from "./config.ts";
import type { EmailService } from "./email/email-service.ts";
import type { Logger } from "./logger.ts";

export type HonoVariables = {
  config: Config;
  db: Database;
  emailService: EmailService;
  logger: Logger;
  session?: Selectable<Session>;
  account?: Selectable<Account>;
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
