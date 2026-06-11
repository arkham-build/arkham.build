-- migrate:up
alter table account
  add column last_activity_at timestamp not null default now();

create index idx_account_last_activity_at on account (last_activity_at);

-- migrate:down
drop index if exists idx_account_last_activity_at;

alter table account
  drop column last_activity_at;
