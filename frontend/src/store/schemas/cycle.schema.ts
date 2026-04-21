import { JsonDataCycleSchema } from "@arkham-build/shared";
import { z } from "zod";

const CycleSchema = JsonDataCycleSchema.extend({
  image_url: z.string().nullish(),
  name: z.string().nullish(),
  official: z.boolean().nullish(),
  real_name: z.string(),
});

export type Cycle = z.infer<typeof CycleSchema>;
