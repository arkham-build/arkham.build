-- migrate:up

alter table account_identity
add column state jsonb;

-- migrate:down

alter table account_identity
drop column state;
