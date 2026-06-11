-- migrate:up

alter table deck
  add constraint chk_deck_description_length check (octet_length(coalesce(description, '')) <= 131072),
  add constraint chk_deck_tags_length check (octet_length(coalesce(tags, '')) <= 1024),
  add constraint chk_deck_exile_string_length check (octet_length(coalesce(exile_string, '')) <= 4096),
  add constraint chk_deck_id_length check (char_length(id) <= 255),
  add constraint chk_deck_next_deck_length check (char_length(coalesce(next_deck, '')) <= 255),
  add constraint chk_deck_prev_deck_length check (char_length(coalesce(prev_deck, '')) <= 255),
  add constraint chk_deck_problem_length check (char_length(coalesce(problem, '')) <= 255);

alter table account_settings
  add constraint chk_account_settings_settings_length check (
    octet_length(coalesce(settings::text, '')) <= 65536
  );

alter table arkhamdb_deck_snapshot
  add constraint chk_arkhamdb_deck_snapshot_decks_length check (
    octet_length(decks::text) <= 52428800
  );

-- migrate:down

alter table arkhamdb_deck_snapshot
  drop constraint if exists chk_arkhamdb_deck_snapshot_decks_length;

alter table account_settings
  drop constraint if exists chk_account_settings_settings_length;

alter table deck
  drop constraint if exists chk_deck_description_length,
  drop constraint if exists chk_deck_tags_length,
  drop constraint if exists chk_deck_exile_string_length,
  drop constraint if exists chk_deck_id_length,
  drop constraint if exists chk_deck_next_deck_length,
  drop constraint if exists chk_deck_prev_deck_length,
  drop constraint if exists chk_deck_problem_length;

