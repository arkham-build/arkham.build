import { z } from "zod";

export const JsonDataEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type JsonDataEncounterSet = z.infer<typeof JsonDataEncounterSetSchema>;

export const EncounterSetSchema = JsonDataEncounterSetSchema.extend({
  real_name: z.string(),
  pack_code: z.string(),
  icon_url: z.string().nullish(),
  position: z.number().nullish(),
  official: z.boolean().nullish(),
});

export type EncounterSet = z.infer<typeof EncounterSetSchema>;
