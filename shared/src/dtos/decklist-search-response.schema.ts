import { z } from "zod";
import { ArkhamDbDecklistSchema } from "../schemas/arkhamdb-decklist.schema.ts";

// TECH DEBT: legacy deck format
const DecklistSearchResultSchema = ArkhamDbDecklistSchema.extend({
  date_creation: z.coerce.string(),
  date_update: z.coerce.string().default(""),
  description_md: z.string().default(""),
  meta: z.preprocess((val) => JSON.stringify(val), z.string()).default("{}"),
  source: z.string().default("arkhamdb"),
  tags: z.string().default(""),
  user_name: z.string(),
  user_reputation: z.coerce.number().int().min(0),
  version: z.string().default("1.0"),
}).transform(({ side_slots, ignore_deck_limit_slots, ...rest }) => ({
  ...rest,
  sideSlots: side_slots,
  ignoreDeckLimitSlots: ignore_deck_limit_slots,
}));

export const DecklistSearchResponseSchema = z.object({
  meta: z.object({
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0),
    total: z.coerce.number().int().min(0),
  }),
  data: z.array(DecklistSearchResultSchema),
});

export type DecklistSearchResult = z.infer<typeof DecklistSearchResultSchema>;

export type DecklistSearchResponse = z.infer<
  typeof DecklistSearchResponseSchema
>;
