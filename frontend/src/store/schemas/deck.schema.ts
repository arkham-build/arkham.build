import * as z from "zod";

const idSchema = z.union([z.number(), z.string()]);
export type Id = z.infer<typeof idSchema>;

export const SlotsSchema = z.record(z.string(), z.number());
export type Slots = z.infer<typeof SlotsSchema>;

const DeckProblemSchema = z.enum([
  "too_few_cards",
  "too_many_cards",
  "too_many_copies",
  "invalid_cards",
  "deck_options_limit",
  "investigator",
]);
export type DeckProblem = z.infer<typeof DeckProblemSchema>;

const SafeSlotsSchema = z.preprocess(
  (val) => (Array.isArray(val) ? {} : val),
  SlotsSchema.nullish(),
);

export const DeckSchema = z.object({
  date_creation: z.string(),
  date_update: z.string(),
  description_md: z.string(),
  exile_string: z.string().nullish(),
  ignoreDeckLimitSlots: SafeSlotsSchema,
  id: idSchema,
  investigator_code: z.string(),
  investigator_name: z.string().nullish(),
  meta: z.string(),
  name: z.string(),
  next_deck: idSchema.nullish(),
  previous_deck: idSchema.nullish(),
  problem: z.union([DeckProblemSchema, z.string()]).nullish(),
  sideSlots: SafeSlotsSchema,
  slots: SlotsSchema,
  source: z.string().nullish(),
  taboo_id: z.number().nullish(),
  tags: z.string(),
  user_id: z.number().nullish(),
  version: z.string(),
  xp_adjustment: z.number().nullish(),
  xp_spent: z.number().nullish(),
  xp: z.number().nullish(),
});

export type Deck = z.infer<typeof DeckSchema>;

export function isDeck(x: unknown): x is Deck {
  const res = DeckSchema.safeParse(x);
  if (!res.success) {
    console.error(res.error);
  }
  return res.success;
}
