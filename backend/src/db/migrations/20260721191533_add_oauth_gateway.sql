-- migrate:up

create type oauth_authorization_decision as enum ('approved', 'denied');
create type oauth_scope as enum (
  'profile:read',
  'decks:read',
  'decks:write',
  'decks:delete'
);

create domain oauth_scopes as text[]
  check (
    value @> array['profile:read']::text[]
    and value <@ enum_range(null::oauth_scope)::text[]
  );

create table oauth_client (
  id uuid primary key default uuidv7(),
  name varchar(128) not null,
  secret_hash text not null,
  disabled_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint chk_oauth_client_secret_hash check (
    octet_length(secret_hash) between 1 and 1024
  )
);

create table oauth_client_redirect_uri (
  oauth_client_id uuid not null references oauth_client(id) on delete cascade,
  redirect_uri text not null,
  created_at timestamp not null default now(),
  primary key (oauth_client_id, redirect_uri),
  constraint chk_oauth_client_redirect_uri_length check (
    octet_length(redirect_uri) between 1 and 2048
  )
);

create table oauth_authorization_request (
  id uuid primary key default uuidv7(),
  request_token_hash text not null unique,
  oauth_client_id uuid not null references oauth_client(id) on delete cascade,
  account_id uuid references account(id) on delete cascade,
  redirect_uri text not null,
  scopes oauth_scopes not null,
  state text not null,
  expires_at timestamp not null,
  claimed_at timestamp,
  consumed_at timestamp,
  decision oauth_authorization_decision,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint chk_oauth_authorization_request_redirect_uri check (
    octet_length(redirect_uri) between 1 and 2048
  ),
  constraint chk_oauth_authorization_request_state check (
    octet_length(state) between 1 and 1024
  ),
  constraint chk_oauth_authorization_request_claim check (
    (account_id is null) = (claimed_at is null)
  ),
  constraint chk_oauth_authorization_request_decision_consumed check (
    decision is null or consumed_at is not null
  )
);

create index idx_oauth_authorization_request_client_id
  on oauth_authorization_request (oauth_client_id);

create index idx_oauth_authorization_request_account_id
  on oauth_authorization_request (account_id);

create index idx_oauth_authorization_request_client_redirect_pending
  on oauth_authorization_request (oauth_client_id, redirect_uri)
  where consumed_at is null;

create index idx_oauth_authorization_request_account_client_pending
  on oauth_authorization_request (account_id, oauth_client_id)
  where account_id is not null and consumed_at is null;

create index idx_oauth_authorization_request_expiry
  on oauth_authorization_request (expires_at, id);

create table oauth_grant (
  id uuid primary key default uuidv7(),
  oauth_client_id uuid not null references oauth_client(id) on delete cascade,
  account_id uuid not null references account(id) on delete cascade,
  scopes oauth_scopes not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (oauth_client_id, account_id)
);

create index idx_oauth_grant_account_id on oauth_grant (account_id);

create table oauth_authorization_code (
  id uuid primary key default uuidv7(),
  oauth_grant_id uuid not null references oauth_grant(id) on delete cascade,
  code_hash text not null unique,
  redirect_uri text not null,
  scopes oauth_scopes not null,
  expires_at timestamp not null,
  used_at timestamp,
  revoked_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint chk_oauth_authorization_code_redirect_uri check (
    octet_length(redirect_uri) between 1 and 2048
  )
);

create index idx_oauth_authorization_code_grant_id
  on oauth_authorization_code (oauth_grant_id);

create index idx_oauth_authorization_code_grant_redirect_pending
  on oauth_authorization_code (oauth_grant_id, redirect_uri)
  where used_at is null and revoked_at is null;

create index idx_oauth_authorization_code_expiry
  on oauth_authorization_code (expires_at, id);

create table oauth_refresh_token (
  id uuid primary key default uuidv7(),
  oauth_grant_id uuid not null references oauth_grant(id) on delete cascade,
  token_hash text not null unique,
  scopes oauth_scopes not null,
  expires_at timestamp not null,
  revoked_at timestamp,
  last_used_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  rotated_at timestamp,
  unique (id, oauth_grant_id)
);

create index idx_oauth_refresh_token_grant_id
  on oauth_refresh_token (oauth_grant_id);

create index idx_oauth_refresh_token_expiry
  on oauth_refresh_token (expires_at, id);

create table oauth_access_token (
  id uuid primary key default uuidv7(),
  oauth_grant_id uuid not null references oauth_grant(id) on delete cascade,
  oauth_refresh_token_id uuid not null,
  token_hash text not null unique,
  scopes oauth_scopes not null,
  expires_at timestamp not null,
  revoked_at timestamp,
  last_used_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  foreign key (oauth_refresh_token_id, oauth_grant_id)
    references oauth_refresh_token(id, oauth_grant_id) on delete cascade
);

create index idx_oauth_access_token_grant_id
  on oauth_access_token (oauth_grant_id);

create index idx_oauth_access_token_refresh_token_id
  on oauth_access_token (oauth_refresh_token_id);

create index idx_oauth_access_token_expiry
  on oauth_access_token (expires_at, id);

-- migrate:down

drop table if exists oauth_access_token;
drop table if exists oauth_refresh_token;
drop table if exists oauth_authorization_code;
drop table if exists oauth_grant;
drop table if exists oauth_authorization_request;
drop table if exists oauth_client_redirect_uri;
drop table if exists oauth_client;

drop domain if exists oauth_scopes;
drop type if exists oauth_scope;
drop type if exists oauth_authorization_decision;
