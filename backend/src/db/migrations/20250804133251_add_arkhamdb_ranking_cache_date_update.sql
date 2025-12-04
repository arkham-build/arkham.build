-- migrate:up

ALTER TABLE arkhamdb_ranking_cache ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- migrate:down

ALTER TABLE arkhamdb_ranking_cache DROP COLUMN updated_at;
