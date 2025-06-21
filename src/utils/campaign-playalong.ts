import { RETURN_TO_CYCLES } from "./constants";

export const CAMPAIGN_PLAYALONG_PROJECT_ID =
  "5b6a1f95-73d1-4059-8af2-b9a645efd625";

const CAMPAIGN_PLAYALONG_PACKS = [
  "core",
  "rcore",
  "rtnotz",
  "nat",
  "har",
  "win",
  "jac",
  "ste",
];

export function campaignPlayalongPacks(cycle: string) {
  const packs = [];
  if (cycle !== "core") packs.push(`${cycle}p`);

  if (RETURN_TO_CYCLES[cycle]) packs.push(RETURN_TO_CYCLES[cycle]);

  packs.push(...CAMPAIGN_PLAYALONG_PACKS);

  return packs;
}
