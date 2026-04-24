import { z } from "zod";

export const JsonDataCycleSchema = z.object({
  code: z.string(),
  name: z.string(),
  position: z.number(),
});

export type JsonDataCycle = z.infer<typeof JsonDataCycleSchema>;
