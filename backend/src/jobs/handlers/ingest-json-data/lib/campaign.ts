import type { JsonDataCampaign } from "@arkham-build/shared";
import { uniqueStrings } from "./helpers.ts";

export function resolveCampaignRecords(campaigns: JsonDataCampaign[]) {
  return {
    campaigns: resolveCampaigns(campaigns),
    campaignScenarios: resolveCampaignScenarios(campaigns),
  };
}

type CampaignRecord = {
  code: string;
  cycle_code: string;
  name: string;
  translations: CampaignTranslation[];
  variant_of_code: string | null;
};

type CampaignTranslation = {
  locale: string;
  name?: string;
};

type CampaignScenarioRecord = {
  campaign_code: string;
  position: number;
  scenario_code: string;
};

function resolveCampaigns(campaigns: JsonDataCampaign[]): CampaignRecord[] {
  return campaigns.map((campaign) => ({
    code: campaign.code,
    cycle_code: campaign.cycle_code,
    name: campaign.name,
    translations: [],
    variant_of_code: campaign.variant_of_code ?? null,
  }));
}

function resolveCampaignScenarios(
  campaigns: JsonDataCampaign[],
): CampaignScenarioRecord[] {
  return campaigns.flatMap((campaign) =>
    uniqueStrings(campaign.scenarios).map((scenarioCode, index) => ({
      campaign_code: campaign.code,
      scenario_code: scenarioCode,
      position: index + 1,
    })),
  );
}
