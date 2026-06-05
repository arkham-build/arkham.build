-- migrate:up

CREATE TABLE rules_version (
  citation VARCHAR(255) PRIMARY KEY,
  date DATE NOT NULL
);

ALTER TABLE errata
  ALTER COLUMN citation TYPE VARCHAR(255);

ALTER TABLE faq
  ALTER COLUMN citation TYPE VARCHAR(255);

ALTER TABLE errata
  ADD CONSTRAINT errata_citation_fkey
  FOREIGN KEY (citation) REFERENCES rules_version(citation) NOT VALID;

ALTER TABLE faq
  ADD CONSTRAINT faq_citation_fkey
  FOREIGN KEY (citation) REFERENCES rules_version(citation) NOT VALID;

CREATE TABLE grimoire_section (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  position INT NOT NULL,
  text TEXT,
  translations JSONB NOT NULL,
  citation VARCHAR(255) REFERENCES rules_version(citation)
);

CREATE TABLE grimoire_entry (
  id VARCHAR(255) PRIMARY KEY,
  section VARCHAR(255) NOT NULL REFERENCES grimoire_section(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT,
  translations JSONB NOT NULL,
  citation VARCHAR(255) NOT NULL REFERENCES rules_version(citation)
);

CREATE TABLE grimoire_entry_reference (
  source_id VARCHAR(255) NOT NULL REFERENCES grimoire_entry(id) ON DELETE CASCADE,
  target_id VARCHAR(255) NOT NULL REFERENCES grimoire_entry(id) ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (source_id, target_id),
  UNIQUE (source_id, position)
);

CREATE INDEX idx_grimoire_entry_citation ON grimoire_entry(citation);
CREATE INDEX idx_grimoire_entry_section ON grimoire_entry(section);
CREATE INDEX idx_grimoire_entry_reference_target_id ON grimoire_entry_reference(target_id);

-- migrate:down
