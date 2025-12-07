import { z } from "zod";

const JsonDataEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
  official: z.boolean().nullish(),
});

export type JsonDataEncounterSet = z.infer<typeof JsonDataEncounterSetSchema>;

const EncounterSetSchema = JsonDataEncounterSetSchema.extend({
  icon_url: z.string().nullish(),
  pack_code: z.string(),
  position: z.number().nullish(),
});

export type EncounterSet = z.infer<typeof EncounterSetSchema>;
