import { z } from "zod";
import { JsonDataCardSchema } from "./card.schema.ts";

export const JsonDataTabooSetSchema = z.object({
  id: z.number(),
  code: z.string(),
  date_start: z.string(),
  cards: z.array(
    JsonDataCardSchema.partial().extend({
      replacement_text: z.string().nullish(),
      replacement_back_text: z.string().nullish(),
    }),
  ),
});

export type JsonDataTabooSet = z.infer<typeof JsonDataTabooSetSchema>;
