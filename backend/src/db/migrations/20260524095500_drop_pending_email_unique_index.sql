-- migrate:up

alter table account_identity
alter column provider_user_id drop not null;

drop index if exists idx_account_identity_provider_pending_email;

-- migrate:down

create unique index idx_account_identity_provider_pending_email on account_identity (provider, pending_email) where pending_email is not null;

alter table account_identity
alter column provider_user_id set not null;
