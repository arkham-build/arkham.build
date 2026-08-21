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
