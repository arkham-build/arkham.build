-- migrate:up

ALTER TABLE campaign
  ADD COLUMN campaign_guide_url TEXT;

ALTER TABLE scenario
  ADD COLUMN rules_insert_url TEXT,
  ADD COLUMN campaign_guide_location INTEGER,
  ADD CONSTRAINT scenario_campaign_guide_location_check
    CHECK (campaign_guide_location > 0);

-- migrate:down

ALTER TABLE scenario
  DROP CONSTRAINT scenario_campaign_guide_location_check,
  DROP COLUMN campaign_guide_location,
  DROP COLUMN rules_insert_url;

ALTER TABLE campaign
  DROP COLUMN campaign_guide_url;
