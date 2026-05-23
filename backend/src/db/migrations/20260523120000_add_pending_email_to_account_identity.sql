-- migrate:up

alter table account_identity
add column pending_email varchar(255);

create unique index idx_account_identity_provider_pending_email on account_identity (provider, pending_email) where pending_email is not null;

-- migrate:down

drop index if exists idx_account_identity_provider_pending_email;

alter table account_identity
drop column if exists pending_email;
