import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type { Account, Session } from "../db/schema.types.ts";
import type { Config } from "./config.ts";
import type { EmailService } from "./email.ts";
import type { Logger } from "./logger.ts";

export type HonoEnv = {
  Variables: {
    config: Config;
    db: Database;
    emailService: EmailService;
    logger: Logger;
    session?: Selectable<Session>;
    account?: Selectable<Account>;
  };
};
