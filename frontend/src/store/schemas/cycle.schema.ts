import { z } from "zod";

const JsonDataCycleSchema = z.object({
  code: z.string(),
  name: z.string(),
  position: z.number(),
});

export type JsonDataCycle = z.infer<typeof JsonDataCycleSchema>;

const CycleSchema = JsonDataCycleSchema.extend({
  image_url: z.string().nullish(),
  name: z.string().nullish(),
  official: z.boolean().nullish(),
  real_name: z.string(),
});

export type Cycle = z.infer<typeof CycleSchema>;
