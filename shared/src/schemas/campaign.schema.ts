import { z } from "zod";

export const JsonDataCampaignSchema = z.object({
  code: z.string(),
  name: z.string(),
  scenarios: z.array(z.string()),
});

export type JsonDataCampaign = z.infer<typeof JsonDataCampaignSchema>;

export const CampaignSchema = JsonDataCampaignSchema.extend({
  real_name: z.string(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
