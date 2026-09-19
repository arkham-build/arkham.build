import type { Campaign, Scenario } from "@arkham-build/shared";

export type ContentGuide = {
  page: number | null | undefined;
  url: string;
};

export function resolveCampaignGuide(
  campaign: Pick<Campaign, "campaign_guide_url" | "real_campaign_guide_url">,
  scenario?: Pick<
    Scenario,
    "campaign_guide_location" | "real_campaign_guide_location"
  >,
): ContentGuide | undefined {
  if (campaign.campaign_guide_url) {
    return {
      page: scenario?.campaign_guide_location,
      url: campaign.campaign_guide_url,
    };
  }

  if (!campaign.real_campaign_guide_url) return undefined;

  return {
    page: sourceCampaignGuideLocation(scenario),
    url: campaign.real_campaign_guide_url,
  };
}

export function resolveScenarioGuide(
  campaign:
    | Pick<Campaign, "campaign_guide_url" | "real_campaign_guide_url">
    | undefined,
  scenario: Pick<
    Scenario,
    | "campaign_guide_location"
    | "real_campaign_guide_location"
    | "real_rules_insert_url"
    | "rules_insert_url"
  >,
): ContentGuide | undefined {
  if (campaign) return resolveCampaignGuide(campaign, scenario);

  const url = scenario.rules_insert_url ?? scenario.real_rules_insert_url;
  return url ? { page: undefined, url } : undefined;
}

function sourceCampaignGuideLocation(
  scenario:
    | Pick<Scenario, "campaign_guide_location" | "real_campaign_guide_location">
    | undefined,
) {
  if (!scenario) return undefined;

  return scenario.real_campaign_guide_location !== undefined
    ? scenario.real_campaign_guide_location
    : scenario.campaign_guide_location;
}

export function pdfUrlAtPage(url: string, page: number | null | undefined) {
  if (page == null) return url;

  const pdfUrl = new URL(url);
  const fragment = new URLSearchParams(pdfUrl.hash.slice(1));
  fragment.set("page", String(page));
  pdfUrl.hash = fragment.toString();

  return pdfUrl.toString();
}

export function contentBannerConstraints(code: string) {
  switch (code) {
    case "cob":
    case "core_ch2":
    case "tde":
    case "tde_b":
    case "tcu":
    case "parallel":
    case "promo":
    case "return":
    case "small_campaign_expansions":
      return { position: "top" };
    case "side_stories":
      return { position: "bottom" };
    default:
      return undefined;
  }
}

type CampaignVariantNameShortener = (
  variantName: string,
  campaignName: string,
) => string;

export function shortenCampaignVariantName(
  variantName: string,
  campaignName: string,
  locale: string,
) {
  const shortener =
    CAMPAIGN_VARIANT_NAME_SHORTENERS[locale.toLocaleLowerCase()] ??
    defaultCampaignVariantNameShortener;

  return shortener(variantName, campaignName);
}

function defaultCampaignVariantNameShortener(
  variantName: string,
  campaignName: string,
) {
  const campaignNameIndex = variantName
    .toLowerCase()
    .indexOf(campaignName.toLowerCase());

  if (campaignNameIndex === -1) return variantName;

  const prefix = variantName
    .slice(0, campaignNameIndex)
    .trim()
    .replace(/[:\-–—]+$/u, "")
    .trimEnd();

  return prefix ? `${prefix}...` : variantName;
}

const CAMPAIGN_VARIANT_NAME_SHORTENERS: Record<
  string,
  CampaignVariantNameShortener
> = {
  pl(variantName: string, campaignName: string) {
    if (/^Powrót(?:\s|$)/u.test(variantName)) return "Powrót...";
    return defaultCampaignVariantNameShortener(variantName, campaignName);
  },
  ru(variantName: string, campaignName: string) {
    if (/(?:^|\.\s*)Возвращение$/u.test(variantName)) return "Возвращение";
    return defaultCampaignVariantNameShortener(variantName, campaignName);
  },
};
