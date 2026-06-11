import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type { AccountFolder, AccountSettings } from "../db/schema.types.ts";

type AccountFolderState = Pick<Selectable<AccountFolder>, "revision" | "state">;
type AccountSettingsState = Pick<
  Selectable<AccountSettings>,
  "collection" | "revision" | "settings"
>;

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

type RevisionedAccountStateParams = AccountFolderParams | AccountSettingsParams;

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
): Promise<AccountFolderState | AccountSettingsState | undefined> {
  return params.table === "account_folder"
    ? upsertAccountFolderState(db, params)
    : upsertAccountSettingsState(db, params);
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
