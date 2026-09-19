import { z } from "zod";

export const JsonDataScenarioSchema = z.object({
  name: z.string(),
  code: z.string(),
  campaign_code: z.string().nullish(),
  campaign_guide_location: z.number().int().positive().nullish(),
  encounter_sets: z.array(
    z.object({
      code: z.string(),
      cards: z.array(z.string()).nullish(),
    }),
  ),
  rules_insert_url: z.url().nullish(),
  variant_of_code: z.string().nullish(),
});

export type JsonDataScenario = z.infer<typeof JsonDataScenarioSchema>;

export const JsonDataScenarioTranslationSchema = z.object({
  campaign_guide_location: z.number().int().positive().nullable().optional(),
  code: z.string(),
  name: z.string().optional(),
  rules_insert_url: z.url().optional(),
});

export type JsonDataScenarioTranslation = z.infer<
  typeof JsonDataScenarioTranslationSchema
>;

export const ScenarioSchema = JsonDataScenarioSchema.extend({
  name: z.string().optional(),
  real_campaign_guide_location: z.number().int().positive().nullish(),
  real_name: z.string(),
  real_rules_insert_url: z.url().nullish(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
