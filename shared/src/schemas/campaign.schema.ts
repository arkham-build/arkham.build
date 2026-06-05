import { z } from "zod";

export const JsonDataCampaignSchema = z.object({
  code: z.string(),
  name: z.string(),
  scenarios: z.array(z.string()),
});

export type JsonDataCampaign = z.infer<typeof JsonDataCampaignSchema>;
