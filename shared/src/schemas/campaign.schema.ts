import { z } from "zod";

export const JsonDataCampaignSchema = z.object({
  campaign_guide_url: z.url().nullish(),
  code: z.string(),
  cycle_code: z.string(),
  name: z.string(),
  scenarios: z.array(z.string()),
  variant_of_code: z.string().nullish(),
});

export type JsonDataCampaign = z.infer<typeof JsonDataCampaignSchema>;

export const JsonDataCampaignTranslationSchema = z.object({
  campaign_guide_url: z.url().optional(),
  code: z.string(),
  name: z.string().optional(),
});

export type JsonDataCampaignTranslation = z.infer<
  typeof JsonDataCampaignTranslationSchema
>;

export const CampaignSchema = JsonDataCampaignSchema.extend({
  name: z.string().optional(),
  real_campaign_guide_url: z.url().nullish(),
  real_name: z.string(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
