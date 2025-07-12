import * as z from "zod/v4-mini";

const DataVersionSchema = z.object({
  card_count: z.number(),
  cards_updated_at: z.string(),
  locale: z.string(),
  translation_updated_at: z.string(),
  // ArkhamCards increments this version in reaction to breaking changes in the card data.
  version: z.optional(z.number()),
});

export type DataVersion = z.infer<typeof DataVersionSchema>;
