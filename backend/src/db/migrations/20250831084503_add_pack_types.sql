-- migrate:up

CREATE TABLE pack_type (
  pack_type VARCHAR(255) PRIMARY KEY
);

INSERT INTO pack_type (pack_type) VALUES
('core_set'),
('deluxe_expansion'),
('mythos_pack'),
('standalone_scenario'),
('return_to'),
('investigator_starter_deck'),
('parallel_investigator'),
('promo'),
('investigator_expansion'),
('campaign_expansion');

ALTER TABLE pack ADD COLUMN type VARCHAR(255) REFERENCES pack_type(pack_type);

-- migrate:down

ALTER TABLE pack DROP COLUMN type;
DROP TABLE pack_type;
