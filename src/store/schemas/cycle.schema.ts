import * as z from "zod/v4-mini";

const JSONDataCycleSchema = z.object({
  code: z.string(),
  name: z.string(),
  position: z.number(),
});

export type JSONDataCycle = z.infer<typeof JSONDataCycleSchema>;

const CycleSchema = z.extend(JSONDataCycleSchema, {
  name: z.optional(z.string()),
  real_name: z.string(),
  image_url: z.optional(z.string()),
  official: z.optional(z.boolean()),
});

export type Cycle = z.infer<typeof CycleSchema>;
