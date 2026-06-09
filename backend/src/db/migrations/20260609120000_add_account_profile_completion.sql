-- migrate:up

alter table account
  add column profile_completed boolean not null default true;

-- migrate:down

alter table account
  drop column profile_completed;
