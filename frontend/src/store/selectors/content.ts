import type { Campaign, Cycle, Pack, Scenario } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { assert } from "@/utils/assert";
import type { StoreState } from "../slices";
import type { Metadata } from "../slices/metadata.types";
import { selectLocaleSortingCollator, selectMetadata } from "./shared";

export type CampaignVersion = {
  campaign: Campaign;
  scenarios: Scenario[];
};

export type CampaignListEntry = CampaignVersion & {
  cycle: Cycle;
  releaseYear?: number;
  variants: CampaignVersion[];
};

export type StandaloneScenarioYearGroup = {
  releaseYear?: number;
  scenarios: Scenario[];
};

export type StandaloneScenarioGroup = {
  cycle: Cycle;
  yearGroups: StandaloneScenarioYearGroup[];
};

type StandaloneScenarioEntry = {
  pack: Pack;
  release: number | undefined;
  scenario: Scenario;
};

type StandaloneScenarioGroupBuilder = {
  cycle: Cycle;
  scenarios: StandaloneScenarioEntry[];
};

export const selectCampaigns = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator): CampaignListEntry[] => {
    const variantsByCampaign = groupCampaignVariants(metadata);
    const earliestReleases = earliestPackReleasesByCycle(metadata);

    return Object.values(metadata.campaigns)
      .filter((campaign) => campaign.variant_of_code == null)
      .map((campaign) => {
        const cycle = metadata.cycles[campaign.cycle_code];
        assert(cycle, `Campaign ${campaign.code} has no cycle`);

        return {
          campaign,
          cycle,
          releaseYear: releaseYear(earliestReleases[cycle.code]),
          scenarios: resolveCampaignScenarios(campaign, metadata),
          variants: (variantsByCampaign[campaign.code] ?? [])
            .map((variant) => ({
              campaign: variant,
              scenarios: resolveCampaignScenarios(variant, metadata),
            }))
            .toSorted((a, b) =>
              collator.compare(a.campaign.real_name, b.campaign.real_name),
            ),
        };
      })
      .toSorted((a, b) => {
        const dateComparison = compareReleaseDatesDescending(
          earliestReleases[a.cycle.code],
          earliestReleases[b.cycle.code],
        );
        if (dateComparison !== 0) return dateComparison;

        return collator.compare(a.campaign.real_name, b.campaign.real_name);
      });
  },
);

export function selectScenarioByCode(
  state: StoreState,
  code: string | undefined,
): Scenario | undefined {
  if (code == null) return undefined;

  return selectMetadata(state).scenarios[code];
}

export const selectStandaloneScenarioGroups = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator): StandaloneScenarioGroup[] => {
    const groups = new Map<string, StandaloneScenarioGroupBuilder>();
    const earliestReleases = earliestPackReleasesByCycle(metadata);

    for (const scenario of Object.values(metadata.scenarios)) {
      if (scenario.campaign_code != null) continue;

      const pack = resolveScenarioPack(scenario, metadata);
      const cycle = resolvePackCycle(pack, scenario, metadata);
      const group = groups.get(cycle.code) ?? { cycle, scenarios: [] };
      group.scenarios.push({
        pack,
        release: packRelease(pack),
        scenario,
      });
      groups.set(cycle.code, group);
    }

    return Array.from(groups.values())
      .map(({ cycle, scenarios }) => ({
        cycle,
        yearGroups: groupStandaloneScenariosByYear(scenarios, collator),
      }))
      .toSorted((a, b) => {
        const dateComparison = compareReleaseDatesDescending(
          earliestReleases[a.cycle.code],
          earliestReleases[b.cycle.code],
        );
        if (dateComparison !== 0) return dateComparison;

        return collator.compare(a.cycle.real_name, b.cycle.real_name);
      });
  },
);

function groupCampaignVariants(metadata: Metadata) {
  const variants: Record<string, Campaign[]> = {};

  for (const campaign of Object.values(metadata.campaigns)) {
    const baseCode = campaign.variant_of_code;
    if (baseCode == null) continue;

    assert(
      metadata.campaigns[baseCode],
      `Campaign variant ${campaign.code} has no base campaign`,
    );

    const campaignVariants = variants[baseCode] ?? [];
    campaignVariants.push(campaign);
    variants[baseCode] = campaignVariants;
  }

  return variants;
}

function resolveCampaignScenarios(campaign: Campaign, metadata: Metadata) {
  return campaign.scenarios.map((scenarioCode) => {
    const scenario = metadata.scenarios[scenarioCode];
    assert(
      scenario,
      `Campaign ${campaign.code} references missing scenario ${scenarioCode}`,
    );
    return scenario;
  });
}

function resolvePackCycle(pack: Pack, scenario: Scenario, metadata: Metadata) {
  const cycle = metadata.cycles[pack.cycle_code];
  assert(cycle, `Scenario ${scenario.code} has no cycle`);
  return cycle;
}

function resolveScenarioPack(scenario: Scenario, metadata: Metadata) {
  const encounterCode = scenario.encounter_sets.at(0)?.code;
  assert(encounterCode, `Scenario ${scenario.code} has no encounter sets`);

  const encounterSet = metadata.encounterSets[encounterCode];
  assert(
    encounterSet,
    `Scenario ${scenario.code} references missing encounter set ${encounterCode}`,
  );

  const pack = metadata.packs[encounterSet.pack_code];
  assert(pack, `Scenario ${scenario.code} has no pack`);
  return pack;
}

function groupStandaloneScenariosByYear(
  entries: StandaloneScenarioEntry[],
  collator: Intl.Collator,
) {
  const yearGroups = new Map<number | undefined, Scenario[]>();
  const sortedEntries = entries.toSorted((a, b) => {
    const dateComparison = compareReleaseDatesDescending(a.release, b.release);
    if (dateComparison !== 0) return dateComparison;

    if (a.pack.position !== b.pack.position) {
      return b.pack.position - a.pack.position;
    }

    return collator.compare(b.scenario.real_name, a.scenario.real_name);
  });

  for (const entry of sortedEntries) {
    const year = releaseYear(entry.release);
    const scenarios = yearGroups.get(year) ?? [];
    scenarios.push(entry.scenario);
    yearGroups.set(year, scenarios);
  }

  return Array.from(yearGroups, ([year, scenarios]) => ({
    releaseYear: year,
    scenarios,
  }));
}

function earliestPackReleasesByCycle(metadata: Metadata) {
  const releases: Record<string, number> = {};

  for (const pack of Object.values(metadata.packs)) {
    const release = packRelease(pack);
    if (release == null) continue;

    const earliestRelease = releases[pack.cycle_code];
    if (earliestRelease == null || release < earliestRelease) {
      releases[pack.cycle_code] = release;
    }
  }

  return releases;
}

function packRelease(pack: Pack) {
  if (!pack.date_release) return undefined;

  const release = Date.parse(pack.date_release);
  assert(
    !Number.isNaN(release),
    `Pack ${pack.code} has an invalid release date`,
  );
  return release;
}

function releaseYear(release?: number) {
  return release == null ? undefined : new Date(release).getUTCFullYear();
}

function compareReleaseDatesDescending(a?: number, b?: number) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}
