-- migrate:up
ALTER TABLE arkhamdb_decklist ADD COLUMN description_word_count INT NOT NULL DEFAULT 0;

-- migrate:down
ALTER TABLE arkhamdb_decklist DROP COLUMN description_word_count;
