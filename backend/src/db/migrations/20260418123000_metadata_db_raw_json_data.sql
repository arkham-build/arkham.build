-- migrate:up

DROP FUNCTION IF EXISTS resolve_card(character varying);

DROP INDEX IF EXISTS idx_card_alternate_of_code;
DROP INDEX IF EXISTS idx_card_duplicate_of_code;

ALTER TABLE card
  DROP CONSTRAINT IF EXISTS card_alternate_of_code_fkey,
  DROP CONSTRAINT IF EXISTS card_duplicate_of_code_fkey;

ALTER TABLE card RENAME COLUMN alternate_of_code TO alternate_of;
ALTER TABLE card RENAME COLUMN duplicate_of_code TO duplicate_of;
ALTER TABLE card RENAME COLUMN back_link_id TO back_link;
ALTER TABLE card RENAME COLUMN real_back_flavor TO back_flavor;
ALTER TABLE card RENAME COLUMN real_back_name TO back_name;
ALTER TABLE card RENAME COLUMN real_back_text TO back_text;
ALTER TABLE card RENAME COLUMN real_back_traits TO back_traits;
ALTER TABLE card RENAME COLUMN real_customization_change TO customization_change;
ALTER TABLE card RENAME COLUMN real_customization_text TO customization_text;
ALTER TABLE card RENAME COLUMN real_flavor TO flavor;
ALTER TABLE card RENAME COLUMN real_name TO name;
ALTER TABLE card RENAME COLUMN real_slot TO slot;
ALTER TABLE card RENAME COLUMN real_subname TO subname;
ALTER TABLE card RENAME COLUMN real_taboo_text_change TO taboo_text_change;
ALTER TABLE card RENAME COLUMN real_text TO text;
ALTER TABLE card RENAME COLUMN real_traits TO traits;

ALTER TABLE card
  ADD COLUMN abbreviation VARCHAR(255),
  ADD COLUMN back_subname VARCHAR(255),
  ADD COLUMN back_type VARCHAR(255),
  ADD COLUMN bonded_count INT,
  ADD COLUMN bonded_to VARCHAR(255),
  ADD COLUMN doom_per_investigator BOOLEAN,
  ADD COLUMN enemy_fight_per_investigator BOOLEAN,
  ADD COLUMN enemy_evade_per_investigator BOOLEAN,
  ADD COLUMN shroud_per_investigator BOOLEAN,
  ADD COLUMN starts_in_hand BOOLEAN,
  ADD COLUMN starts_in_play BOOLEAN,
  ADD COLUMN sticky_mulligan BOOLEAN,
  ADD COLUMN attachments JSONB,
  ADD COLUMN reprint_of VARCHAR(255);

ALTER TABLE card
  ALTER COLUMN deck_requirements TYPE TEXT USING deck_requirements::text,
  ALTER COLUMN side_deck_requirements TYPE TEXT USING side_deck_requirements::text,
  ALTER COLUMN restrictions TYPE TEXT USING restrictions::text,
  ALTER COLUMN tags TYPE TEXT USING tags::text;

ALTER TABLE card
  DROP COLUMN alt_art_investigator,
  DROP COLUMN linked,
  DROP COLUMN heals_damage,
  DROP COLUMN heals_horror;

ALTER TABLE cycle RENAME COLUMN real_name TO name;

ALTER TABLE pack RENAME COLUMN real_name TO name;

ALTER TABLE pack
  ADD COLUMN chapter INT,
  ADD COLUMN date_release TIMESTAMP,
  ADD COLUMN size INT,
  ADD COLUMN reprint_type VARCHAR(255),
  ADD COLUMN reprint_packs JSONB;

ALTER TABLE encounter_set RENAME COLUMN real_name TO name;

ALTER TABLE faction ADD COLUMN translations JSONB;
UPDATE faction SET translations = '[]'::jsonb WHERE translations IS NULL;
ALTER TABLE faction ALTER COLUMN translations SET NOT NULL;

ALTER TABLE subtype ADD COLUMN translations JSONB;
UPDATE subtype SET translations = '[]'::jsonb WHERE translations IS NULL;
ALTER TABLE subtype ALTER COLUMN translations SET NOT NULL;

ALTER TABLE type ADD COLUMN translations JSONB;
UPDATE type SET translations = '[]'::jsonb WHERE translations IS NULL;
ALTER TABLE type ALTER COLUMN translations SET NOT NULL;

ALTER TABLE taboo_set RENAME COLUMN date TO date_start;

ALTER TABLE taboo_set
  ADD COLUMN code VARCHAR(255);

UPDATE taboo_set
SET code = id::text
WHERE code IS NULL;

ALTER TABLE taboo_set
  ALTER COLUMN code SET NOT NULL;

ALTER TABLE data_version
  ADD COLUMN ingested_commit_id VARCHAR(255);

ALTER TABLE card
  ADD CONSTRAINT card_alternate_of_fkey FOREIGN KEY (alternate_of) REFERENCES card(id) DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT card_duplicate_of_fkey FOREIGN KEY (duplicate_of) REFERENCES card(id) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_card_alternate_of ON card(alternate_of);
CREATE INDEX idx_card_duplicate_of ON card(duplicate_of);

CREATE OR REPLACE FUNCTION resolve_card(input_id VARCHAR(255))
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT resolves_to FROM card_resolution WHERE id = input_id),
        input_id
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- migrate:down
