export function shortenCampaignVariantName(
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
