-- migrate:up

delete from session;

alter table session add column token_hash text not null unique;

-- migrate:down

alter table session drop column token_hash;
