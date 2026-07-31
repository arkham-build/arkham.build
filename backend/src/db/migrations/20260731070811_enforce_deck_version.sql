-- migrate:up

alter table deck
  add constraint chk_deck_version_format
  check (version is not null and version ~ '^[0-9]+\.[0-9]+$')
  not valid;

alter table deck validate constraint chk_deck_version_format;

alter table deck alter column version set not null;

-- migrate:down

alter table deck alter column version drop not null;

alter table deck drop constraint if exists chk_deck_version_format;
