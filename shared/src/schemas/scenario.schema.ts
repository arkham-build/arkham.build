import { z } from "zod";

export const JsonDataScenarioSchema = z.object({
  name: z.string(),
  code: z.string(),
  campaign_code: z.string().nullish(),
  encounter_sets: z.array(
    z.object({
      code: z.string(),
      cards: z.array(z.string()).nullish(),
    }),
  ),
});

export type JsonDataScenario = z.infer<typeof JsonDataScenarioSchema>;
