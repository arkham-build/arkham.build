import { z } from "zod";

export const JsonDataEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type JsonDataEncounterSet = z.infer<typeof JsonDataEncounterSetSchema>;
