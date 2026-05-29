-- migrate:up

CREATE TABLE account_folder(
  account_id uuid primary key references account(id) on delete cascade,
  revision uuid NOT NULL DEFAULT uuidv7(),
  state jsonb NOT NULL
);

CREATE INDEX idx_account_folder_account_id ON account_folder(account_id);

-- migrate:down

DROP INDEX IF EXISTS idx_account_folder_account_id;
DROP TABLE IF EXISTS account_folder;
