import { z } from "zod";

const JsonDataEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type JsonDataEncounterSet = z.infer<typeof JsonDataEncounterSetSchema>;

const EncounterSetSchema = JsonDataEncounterSetSchema.extend({
  pack_code: z.string(),
  icon_url: z.string().nullish(),
  position: z.number().nullish(),
  official: z.boolean().nullish(),
});

export type EncounterSet = z.infer<typeof EncounterSetSchema>;
