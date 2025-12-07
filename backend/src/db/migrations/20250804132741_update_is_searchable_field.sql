-- migrate:up
ALTER TABLE arkhamdb_decklist DROP COLUMN is_searchable;

ALTER TABLE arkhamdb_decklist ADD COLUMN is_searchable BOOLEAN GENERATED ALWAYS AS (
    (like_count > 0 OR (next_deck IS NULL AND previous_deck IS NULL))
    AND name != ''
    AND LENGTH(description_md) >= 10
) STORED;

-- migrate:down
