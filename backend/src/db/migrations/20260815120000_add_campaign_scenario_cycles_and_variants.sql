-- migrate:up

ALTER TABLE campaign
  ADD COLUMN cycle_code VARCHAR(255) REFERENCES cycle(code),
  ADD COLUMN variant_of_code VARCHAR(255) REFERENCES campaign(code) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE scenario
  ADD COLUMN variant_of_code VARCHAR(255) REFERENCES scenario(code) DEFERRABLE INITIALLY DEFERRED;

UPDATE campaign
SET cycle_code = cycle.code
FROM cycle
WHERE campaign.code = cycle.code;

UPDATE campaign
SET cycle_code = cycle.code
FROM cycle
WHERE cycle.code = 'return'
  AND campaign.code LIKE 'rt%'
  AND campaign.cycle_code IS NULL;

UPDATE campaign
SET cycle_code = source.cycle_code
FROM (
  SELECT DISTINCT ON (campaign_scenario.campaign_code)
    campaign_scenario.campaign_code,
    pack.cycle_code
  FROM campaign_scenario
  JOIN scenario ON scenario.code = campaign_scenario.scenario_code
  JOIN scenario_encounter_set ON scenario_encounter_set.scenario_code = scenario.code
  JOIN encounter_set ON encounter_set.code = scenario_encounter_set.encounter_code
  JOIN pack ON pack.code = encounter_set.pack_code
  ORDER BY
    campaign_scenario.campaign_code,
    campaign_scenario.position,
    scenario_encounter_set.position
) AS source
WHERE campaign.code = source.campaign_code
  AND campaign.cycle_code IS NULL;

ALTER TABLE campaign
  ALTER COLUMN cycle_code SET NOT NULL;

-- migrate:down

ALTER TABLE scenario
  DROP COLUMN variant_of_code;

ALTER TABLE campaign
  DROP COLUMN variant_of_code,
  DROP COLUMN cycle_code;
