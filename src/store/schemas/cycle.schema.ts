import * as z from "zod/v4-mini";

const JSONDataCycleSchema = z.object({
  code: z.string(),
  name: z.string(),
  position: z.number(),
});

export type JSONDataCycle = z.infer<typeof JSONDataCycleSchema>;

const CycleSchema = z.extend(JSONDataCycleSchema, {
  image_url: z.optional(z.string()),
  name: z.optional(z.string()),
  official: z.optional(z.boolean()),
  real_name: z.string(),
});

export type Cycle = z.infer<typeof CycleSchema>;
