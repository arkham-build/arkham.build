-- migrate:up

create table arkhamdb_deck_additional_metadata (
  id text primary key default uuidv7()::text,
  deck_id integer not null,
  data jsonb not null
);


-- migrate:down

drop table if exists arkhamdb_deck_additional_metadata;
