-- migrate:up

create table arkhamdb_deck_snapshot (
  id uuid primary key default uuidv7(),
  account_identity_id uuid not null references account_identity(id) on delete cascade,
  last_modified text,
  decks jsonb not null,
  created_at timestamp without time zone not null default now()
);

create index idx_arkhamdb_deck_snapshot_account_identity_id
  on arkhamdb_deck_snapshot (account_identity_id);

-- migrate:down

drop index if exists idx_arkhamdb_deck_snapshot_account_identity_id;
drop table if exists arkhamdb_deck_snapshot;
