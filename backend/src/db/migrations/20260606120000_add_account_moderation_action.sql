-- migrate:up

create extension if not exists btree_gist;

create type moderation_action_scope as enum ('account');
create type moderation_action_type as enum ('warning', 'ban');

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

-- migrate:down

drop index if exists idx_account_moderation_action_account_type_scope_created_at;
drop index if exists idx_account_moderation_action_account_id;

drop table if exists account_moderation_action;

drop type if exists moderation_action_type;
drop type if exists moderation_action_scope;
