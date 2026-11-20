-- migrate:up

alter table pack add column preview boolean default false;

-- migrate:down

alter table pack drop column preview;
