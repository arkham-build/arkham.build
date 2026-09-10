-- migrate:up

alter table account
  add column permissions jsonb not null default '[]'::jsonb,
  add constraint chk_account_permissions_array check (
    jsonb_typeof(permissions) = 'array'
  );

-- migrate:down

alter table account drop column permissions;

