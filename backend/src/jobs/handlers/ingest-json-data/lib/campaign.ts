import type {
  JsonDataCampaign,
  JsonDataCampaignTranslation,
} from "@arkham-build/shared";
import type {
  ItemTranslation,
  WithItemTranslations,
} from "../../../../lib/json-data.types.ts";
import { uniqueStrings } from "./helpers.ts";

export function resolveCampaignRecords(campaigns: CampaignWithTranslations[]) {
  return {
    campaigns: resolveCampaigns(campaigns),
    campaignScenarios: resolveCampaignScenarios(campaigns),
  };
}

type CampaignWithTranslations = WithItemTranslations<
  JsonDataCampaign,
  JsonDataCampaignTranslation
>;

type CampaignRecord = {
  campaign_guide_url: string | null;
  code: string;
  cycle_code: string;
  name: string;
  translations: CampaignTranslation[];
  variant_of_code: string | null;
};

type CampaignTranslation = ItemTranslation<JsonDataCampaignTranslation>;

type CampaignScenarioRecord = {
  campaign_code: string;
  position: number;
  scenario_code: string;
};

function resolveCampaigns(
  campaigns: CampaignWithTranslations[],
): CampaignRecord[] {
  return campaigns.map((campaign) => ({
    campaign_guide_url: campaign.campaign_guide_url ?? null,
    code: campaign.code,
    cycle_code: campaign.cycle_code,
    name: campaign.name,
    translations: campaign.translations,
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
