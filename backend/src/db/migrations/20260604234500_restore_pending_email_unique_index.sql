-- migrate:up

create unique index if not exists idx_account_identity_provider_pending_email on account_identity (provider, pending_email) where pending_email is not null;

-- migrate:down

drop index if exists idx_account_identity_provider_pending_email;
