-- migrate:up

-- Accounts

create table account(
  created_at timestamp not null default now(),
  id uuid primary key default uuidv7(),
  name varchar(64) not null unique,
  updated_at timestamp not null default now()
);

-- Identities

create table account_identity(
  account_id uuid not null references account(id) on delete cascade,
  created_at timestamp not null default now(),
  id uuid primary key default uuidv7(),
  provider varchar(64) not null,
  provider_user_id text not null,
  updated_at timestamp not null default now(),
  verified_at timestamp,

  email varchar(255),
  password_hash text,

  unique(provider, provider_user_id),
  unique(provider, email)
);

create index idx_account_identity_account_id on account_identity (account_id);
create unique index idx_account_identity_provider_uid on account_identity (provider, provider_user_id) where provider_user_id is not null;
create unique index idx_account_identity_provider_email on account_identity (provider, email) where email is not null;

-- Sessions

create table session(
  account_id uuid not null references account(id) on delete cascade,
  created_at timestamp not null default now(),
  expires_at timestamp not null,
  id uuid primary key default uuidv7(),
  last_activity_at timestamp not null default now()
);

create index idx_session_account_id on session (account_id);
create index idx_session_expires_at on session (expires_at);

-- Verification tokens

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

-- OAuth

create table oauth_token(
  account_identity_id uuid primary key references account_identity(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create unique index idx_oauth_tokens_account_identity on oauth_token (account_identity_id);

-- Settings

create table account_settings(
  account_id uuid primary key references account(id) on delete cascade,
  collection jsonb,
  revision uuid NOT NULL DEFAULT uuidv7(),
  settings jsonb
);

create index idx_account_settings_account_id on account_settings (account_id);

-- Decks

create table deck(
  account_id uuid references account(id) on delete cascade,
  created_at timestamp not null default now(),
  description text default '',
  exile_string text,
  id uuid primary key default uuidv7(),
  ignore_deck_limit jsonb,
  investigator_code varchar(255) not null,
  investigator_name varchar(255) not null,
  meta jsonb,
  name varchar(255) not null,
  next_deck text references deck(provider_deck_id) on delete set null,
  prev_deck text references deck(provider_deck_id) on delete set null,
  problem text,
  provider_deck_id text unique,
  provider_type varchar(64) not null,
  side_slots jsonb,
  slots jsonb not null,
  taboo_set_id integer references taboo_set(id) on delete set null,
  tags text,
  updated_at timestamp not null default now(),
  version varchar(8),
  xp integer,
  xp_adjustment integer,
  xp_spent integer
);

create index idx_deck_account_id on deck (account_id);
create index idx_deck_provider_deck_id on deck (provider_deck_id);
create index idx_deck_next_deck on deck (next_deck);
create index idx_deck_prev_deck on deck (prev_deck);

-- migrate:down

drop index if exists idx_account_identity_provider_uid;
drop index if exists idx_account_identity_provider_email;
drop index if exists idx_account_identity_account_id;
drop index if exists idx_oauth_tokens_account_identity;
drop index if exists idx_account_settings_account_id;
drop index if exists idx_account_collections_account_id;
drop index if exists idx_deck_account_id;
drop index if exists idx_deck_provider_deck_id;
drop index if exists idx_deck_next_deck;
drop index if exists idx_deck_prev_deck;
drop index if exists idx_session_account_id;
drop index if exists idx_session_expires_at;
drop index if exists idx_verification_token_email;
drop index if exists idx_verification_token_token_hash;
drop index if exists idx_verification_token_expires_at;

drop table deck;
drop table session;
drop table verification_token;
drop table oauth_token;
drop table account_identity;
drop table account_collection;
drop table account_settings;
drop table account;
