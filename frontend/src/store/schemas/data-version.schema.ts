import * as z from "zod";

const DataVersionSchema = z.object({
  // ArkhamCards increments this version in reaction to breaking changes in the card data.
  card_count: z.number(),
  cards_updated_at: z.string(),
  locale: z.string(),
  translation_updated_at: z.string(),
  version: z.number().nullish(),
});

export type DataVersion = z.infer<typeof DataVersionSchema>;
