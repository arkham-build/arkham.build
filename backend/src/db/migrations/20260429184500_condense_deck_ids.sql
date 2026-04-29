-- migrate:up

alter table deck drop constraint if exists deck_next_deck_fkey;
alter table deck drop constraint if exists deck_prev_deck_fkey;
alter table deck drop constraint if exists deck_provider_deck_id_key;

drop index if exists idx_deck_provider_deck_id;

alter table deck alter column id drop default;
alter table deck
  alter column id type text using coalesce(provider_deck_id, id::text);
alter table deck alter column id set default uuidv7()::text;

alter table deck drop column provider_deck_id;

alter table deck
  add constraint deck_next_deck_fkey foreign key (next_deck) references deck(id) on delete set null;
alter table deck
  add constraint deck_prev_deck_fkey foreign key (prev_deck) references deck(id) on delete set null;

-- migrate:down
