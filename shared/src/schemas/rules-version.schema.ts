import { z } from "zod";

export const JsonDataRulesVersionSchema = z.object({
  citation: z.string(),
  date: z.string(),
});

export type JsonDataRulesVersion = z.infer<typeof JsonDataRulesVersionSchema>;
