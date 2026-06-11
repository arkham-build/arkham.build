-- migrate:up

create unique index idx_account_name_lower on account (lower(name));

-- migrate:down

drop index if exists idx_account_name_lower;
