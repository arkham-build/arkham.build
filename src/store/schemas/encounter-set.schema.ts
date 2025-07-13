import * as z from "zod/v4-mini";

const JsonDataEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
  official: z.optional(z.boolean()),
});

export type JsonDataEncounterSet = z.infer<typeof JsonDataEncounterSetSchema>;

const EncounterSetSchema = z.extend(JsonDataEncounterSetSchema, {
  icon_url: z.optional(z.string()),
  pack_code: z.string(),
});

export type EncounterSet = z.infer<typeof EncounterSetSchema>;
