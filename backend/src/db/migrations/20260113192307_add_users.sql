-- migrate:up

create extension if not exists btree_gist;

create type moderation_action_scope as enum ('account');
create type moderation_action_type as enum ('warning', 'ban');

create table account(
  created_at timestamp not null default now(),
  id uuid primary key default uuidv7(),
  name varchar(64) not null unique,
  updated_at timestamp not null default now(),
  profile_completed_at timestamp default now(),
  last_activity_at timestamp not null default now()
);

create unique index idx_account_name_lower on account (lower(name));
create index idx_account_last_activity_at on account (last_activity_at);

create table account_identity(
  account_id uuid not null references account(id) on delete cascade,
  created_at timestamp not null default now(),
  id uuid primary key default uuidv7(),
  provider varchar(64) not null,
  provider_user_id text,
  updated_at timestamp not null default now(),
  verified_at timestamp,
  email varchar(255),
  password_hash text,
  pending_email varchar(255),
  state jsonb,

  unique(provider, provider_user_id),
  unique(provider, email)
);

create index idx_account_identity_account_id on account_identity (account_id);
create unique index idx_account_identity_provider_uid on account_identity (provider, provider_user_id) where provider_user_id is not null;
create unique index idx_account_identity_provider_email on account_identity (provider, email) where email is not null;
create unique index idx_account_identity_provider_pending_email on account_identity (provider, pending_email) where pending_email is not null;

create table session(
  account_id uuid not null references account(id) on delete cascade,
  created_at timestamp not null default now(),
  expires_at timestamp not null,
  id uuid primary key default uuidv7(),
  last_activity_at timestamp not null default now(),
  token_hash text not null unique
);

create index idx_session_account_id on session (account_id);
create index idx_session_expires_at on session (expires_at);

create table verification_token(
  account_identity_id uuid references account_identity(id) on delete cascade,
  created_at timestamp not null default now(),
  email varchar(255) not null,
  expires_at timestamp not null,
  id uuid primary key default uuidv7(),
  token_hash text not null,
  token_type varchar(32) not null,
  unique(token_type, token_hash)
);

create index idx_verification_token_email on verification_token (email);
create index idx_verification_token_token_hash on verification_token (token_hash);
create index idx_verification_token_expires_at on verification_token (expires_at);

create table oauth_token(
  account_identity_id uuid primary key references account_identity(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create unique index idx_oauth_tokens_account_identity on oauth_token (account_identity_id);

create table account_settings(
  account_id uuid primary key references account(id) on delete cascade,
  collection jsonb,
  revision uuid not null default uuidv7(),
  settings jsonb,
  constraint chk_account_settings_settings_length check (
    octet_length(coalesce(settings::text, '')) <= 65536
  )
);

create index idx_account_settings_account_id on account_settings (account_id);

create table account_folder(
  account_id uuid primary key references account(id) on delete cascade,
  revision uuid not null default uuidv7(),
  state jsonb not null
);

create index idx_account_folder_account_id on account_folder(account_id);

create table deck(
  account_id uuid references account(id) on delete cascade,
  created_at timestamp not null default now(),
  description text default '',
  exile_string text,
  id text primary key default uuidv7()::text,
  ignore_deck_limit jsonb,
  investigator_code varchar(255) not null,
  investigator_name varchar(255) not null,
  meta jsonb,
  name varchar(255) not null,
  next_deck text references deck(id) on delete set null,
  prev_deck text references deck(id) on delete set null,
  problem text,
  provider_type varchar(64) not null,
  side_slots jsonb,
  slots jsonb not null,
  taboo_set_id integer references taboo_set(id) on delete set null,
  tags text,
  updated_at timestamp not null default now(),
  version varchar(8),
  xp integer,
  xp_adjustment integer,
  xp_spent integer,
  constraint chk_deck_description_length check (octet_length(coalesce(description, '')) <= 131072),
  constraint chk_deck_tags_length check (octet_length(coalesce(tags, '')) <= 1024),
  constraint chk_deck_exile_string_length check (octet_length(coalesce(exile_string, '')) <= 4096),
  constraint chk_deck_id_length check (char_length(id) <= 255),
  constraint chk_deck_next_deck_length check (char_length(coalesce(next_deck, '')) <= 255),
  constraint chk_deck_prev_deck_length check (char_length(coalesce(prev_deck, '')) <= 255),
  constraint chk_deck_problem_length check (char_length(coalesce(problem, '')) <= 255)
);

create index idx_deck_account_id on deck (account_id);
create index idx_deck_next_deck on deck (next_deck);
create index idx_deck_prev_deck on deck (prev_deck);

create table arkhamdb_deck_snapshot (
  id uuid primary key default uuidv7(),
  account_identity_id uuid not null references account_identity(id) on delete cascade,
  last_modified text,
  decks jsonb not null,
  created_at timestamp without time zone not null default now(),
  constraint chk_arkhamdb_deck_snapshot_decks_length check (
    octet_length(decks::text) <= 52428800
  )
);

create index idx_arkhamdb_deck_snapshot_account_identity_id
  on arkhamdb_deck_snapshot (account_identity_id);

create table account_moderation_action (
  id uuid primary key default uuidv7(),
  account_id uuid not null references account(id) on delete cascade,
  scope moderation_action_scope not null,
  type moderation_action_type not null,
  reason text not null,
  created_at timestamp not null default now(),
  created_by uuid references account(id) on delete set null,
  ends_at timestamp,
  end_reason text,
  ended_by uuid references account(id) on delete set null,

  constraint chk_account_moderation_action_end_fields
    check ((ends_at is null) = (end_reason is null)),
  constraint chk_account_moderation_action_ended_by
    check (ended_by is null or ends_at is not null),
  constraint chk_account_moderation_action_ends_after_created
    check (ends_at is null or ends_at > created_at)
);

alter table account_moderation_action
add constraint ex_account_moderation_action_no_overlapping_bans
exclude using gist (
  account_id with =,
  scope with =,
  tsrange(created_at, coalesce(ends_at, 'infinity'::timestamp), '[)') with &&
)
where (type = 'ban');

create index idx_account_moderation_action_account_id
  on account_moderation_action (account_id);

create index idx_account_moderation_action_account_type_scope_created_at
  on account_moderation_action (account_id, type, scope, created_at desc);

create table arkhamdb_deck_additional_metadata (
  id text primary key default uuidv7()::text,
  deck_id integer not null,
  data jsonb not null
);

-- migrate:down

drop table if exists arkhamdb_deck_additional_metadata;
drop table if exists account_moderation_action;
drop table if exists arkhamdb_deck_snapshot;
drop table if exists deck;
drop table if exists account_folder;
drop table if exists account_settings;
drop table if exists oauth_token;
drop table if exists verification_token;
drop table if exists session;
drop table if exists account_identity;
drop table if exists account;

drop type if exists moderation_action_type;
drop type if exists moderation_action_scope;
