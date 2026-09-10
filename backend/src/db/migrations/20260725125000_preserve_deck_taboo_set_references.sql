-- migrate:up

alter table deck
  drop constraint deck_taboo_set_id_fkey,
  add constraint deck_taboo_set_id_fkey
    foreign key (taboo_set_id) references taboo_set(id)
    on delete no action deferrable initially deferred;

-- migrate:down

alter table deck
  drop constraint deck_taboo_set_id_fkey,
  add constraint deck_taboo_set_id_fkey
    foreign key (taboo_set_id) references taboo_set(id) on delete set null;
