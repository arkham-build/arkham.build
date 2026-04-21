import { JsonDataEncounterSetSchema } from "@arkham-build/shared";
import { z } from "zod";

const EncounterSetSchema = JsonDataEncounterSetSchema.extend({
  real_name: z.string(),
  pack_code: z.string(),
  icon_url: z.string().nullish(),
  position: z.number().nullish(),
  official: z.boolean().nullish(),
});

export type EncounterSet = z.infer<typeof EncounterSetSchema>;
