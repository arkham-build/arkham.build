import { JsonDataPackSchema } from "@arkham-build/shared";
import { z } from "zod";

const PackSchema = JsonDataPackSchema.extend({
  icon_url: z.string().nullish(),
  name: z.string().nullish(),
  official: z.boolean().nullish(),
  preview: z.boolean().nullish(),
  real_name: z.string(),
});

export type Pack = z.infer<typeof PackSchema>;
