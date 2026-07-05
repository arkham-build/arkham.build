import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type {
  AccountCardTag,
  AccountFolder,
  AccountSettings,
} from "../db/schema.types.ts";

type AccountCardTagState = Pick<
  Selectable<AccountCardTag>,
  "revision" | "state"
>;
type AccountFolderState = Pick<Selectable<AccountFolder>, "revision" | "state">;
type AccountSettingsState = Pick<
  Selectable<AccountSettings>,
  "collection" | "revision" | "settings"
>;

type AccountCardTagParams = {
  accountId: string;
  expectedRevision?: string | null;
  revision: string;
  state: AccountCardTag["state"];
  table: "account_card_tag";
};

type AccountFolderParams = {
  accountId: string;
  expectedRevision?: string | null;
  revision: string;
  state: AccountFolder["state"];
  table: "account_folder";
};

type AccountSettingsParams = {
  accountId: string;
  collection: AccountSettings["collection"];
  expectedRevision?: string | null;
  revision: string;
  settings: AccountSettings["settings"];
  table: "account_settings";
};

type RevisionedAccountStateParams =
  | AccountCardTagParams
  | AccountFolderParams
  | AccountSettingsParams;

export function upsertRevisionedAccountState(
  db: Database,
  params: AccountCardTagParams,
): Promise<AccountCardTagState | undefined>;
export function upsertRevisionedAccountState(
  db: Database,
  params: AccountFolderParams,
): Promise<AccountFolderState | undefined>;
export function upsertRevisionedAccountState(
  db: Database,
  params: AccountSettingsParams,
): Promise<AccountSettingsState | undefined>;
export function upsertRevisionedAccountState(
  db: Database,
  params: RevisionedAccountStateParams,
): Promise<
  AccountCardTagState | AccountFolderState | AccountSettingsState | undefined
> {
  if (params.table === "account_card_tag") {
    return upsertAccountCardTagState(db, params);
  }

  if (params.table === "account_folder") {
    return upsertAccountFolderState(db, params);
  }

  return upsertAccountSettingsState(db, params);
}

function upsertAccountCardTagState(db: Database, params: AccountCardTagParams) {
  const values = {
    account_id: params.accountId,
    revision: params.revision,
    state: params.state,
  };

  if (params.expectedRevision == null) {
    return db
      .insertInto("account_card_tag")
      .values(values)
      .onConflict((oc) => oc.column("account_id").doNothing())
      .returning(["state", "revision"])
      .executeTakeFirst();
  }

  return db
    .insertInto("account_card_tag")
    .values(values)
    .onConflict((oc) =>
      oc
        .column("account_id")
        .doUpdateSet({
          revision: params.revision,
          state: params.state,
        })
        .where("account_card_tag.revision", "=", params.expectedRevision),
    )
    .returning(["state", "revision"])
    .executeTakeFirst();
}

function upsertAccountFolderState(db: Database, params: AccountFolderParams) {
  const values = {
    account_id: params.accountId,
    revision: params.revision,
    state: params.state,
  };

  if (params.expectedRevision == null) {
    return db
      .insertInto("account_folder")
      .values(values)
      .onConflict((oc) => oc.column("account_id").doNothing())
      .returning(["state", "revision"])
      .executeTakeFirst();
  }

  return db
    .insertInto("account_folder")
    .values(values)
    .onConflict((oc) =>
      oc
        .column("account_id")
        .doUpdateSet({
          revision: params.revision,
          state: params.state,
        })
        .where("account_folder.revision", "=", params.expectedRevision),
    )
    .returning(["state", "revision"])
    .executeTakeFirst();
}

function upsertAccountSettingsState(
  db: Database,
  params: AccountSettingsParams,
) {
  const values = {
    account_id: params.accountId,
    collection: params.collection,
    revision: params.revision,
    settings: params.settings,
  };

  if (params.expectedRevision == null) {
    return db
      .insertInto("account_settings")
      .values(values)
      .onConflict((oc) => oc.column("account_id").doNothing())
      .returning(["settings", "collection", "revision"])
      .executeTakeFirst();
  }

  return db
    .insertInto("account_settings")
    .values(values)
    .onConflict((oc) =>
      oc
        .column("account_id")
        .doUpdateSet({
          collection: params.collection,
          revision: params.revision,
          settings: params.settings,
        })
        .where("account_settings.revision", "=", params.expectedRevision),
    )
    .returning(["settings", "collection", "revision"])
    .executeTakeFirst();
}
