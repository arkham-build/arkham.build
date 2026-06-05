import { JsonDataCampaignSchema } from "@arkham-build/shared";
import { z } from "zod";

const CampaignSchema = JsonDataCampaignSchema.extend({
  real_name: z.string(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
