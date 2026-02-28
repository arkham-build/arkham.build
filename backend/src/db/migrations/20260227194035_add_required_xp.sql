-- migrate:up

ALTER TABLE arkhamdb_decklist ADD COLUMN xp_required INTEGER;

CREATE INDEX idx_arkhamdb_decklist_xp_required ON arkhamdb_decklist(xp_required);

-- migrate:down

ALTER TABLE arkhamdb_decklist DROP COLUMN xp_required;

DROP INDEX IF EXISTS idx_arkhamdb_decklist_xp_required;
