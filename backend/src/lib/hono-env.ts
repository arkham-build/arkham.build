import type { OAuthScope } from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type {
  Account,
  OauthAccessToken,
  OauthClient,
  Session,
} from "../db/schema.types.ts";
import type { AuthAccount } from "./auth/accounts.ts";
import type { JobDispatcher } from "../jobs/dispatcher.ts";
import type { Config } from "./config.ts";
import type { Logger } from "./logger.ts";

export type OAuthBearerContext = {
  account: AuthAccount;
  client: Pick<Selectable<OauthClient>, "id" | "name">;
  token: Pick<
    Selectable<OauthAccessToken>,
    "id" | "oauth_grant_id" | "oauth_refresh_token_id"
  >;
  scopes: OAuthScope[];
};

export type HonoVariables = {
  config: Config;
  db: Database;
  dispatcher: JobDispatcher;
  logger: Logger;
  session?: Selectable<Session>;
  account?: Selectable<Account>;
  oauthBearer?: OAuthBearerContext;
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

export type OAuthBearerHonoEnv = WithRequiredHonoVariableKeys<"oauthBearer">;
