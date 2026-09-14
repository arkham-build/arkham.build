import type { JsonDataCampaign } from "@arkham-build/shared";
import { uniqueStrings } from "./helpers.ts";

export function resolveCampaignRecords(campaigns: JsonDataCampaign[]) {
  return {
    campaigns: resolveCampaigns(campaigns),
    campaignScenarios: resolveCampaignScenarios(campaigns),
  };
}

type CampaignRecord = {
  campaign_guide_url: string | null;
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
    campaign_guide_url: campaign.campaign_guide_url ?? null,
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
