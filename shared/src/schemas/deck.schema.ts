import { z } from "zod";
import { maxUtf8Bytes } from "../lib/validation.ts";
import type { Card } from "./card.schema.ts";
import type { Cycle } from "./cycle.schema.ts";
import type { EncounterSet } from "./encounter-set.schema.ts";
import type { Pack } from "./pack.schema.ts";
import { StorageProviderSchema } from "./settings.schema.ts";

export const DECK_DESCRIPTION_MAX_BYTES = 128 * 1024;
export const DECK_EXILE_STRING_MAX_BYTES = 4 * 1024;
export const DECK_ID_MAX_LENGTH = 255;
export const DECK_PROBLEM_MAX_LENGTH = 255;
export const DECK_TAGS_MAX_BYTES = 1024;

export const DeckStringIdSchema = z.string().max(DECK_ID_MAX_LENGTH);
export const DeckIdSchema = z.union([z.number(), DeckStringIdSchema]);
export type DeckId = z.infer<typeof DeckIdSchema>;
export type Id = DeckId;

export const SlotsSchema = z.record(z.string(), z.number());
export type Slots = z.infer<typeof SlotsSchema>;

export const DeckProblemSchema = z.enum([
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
  description_md: maxUtf8Bytes(DECK_DESCRIPTION_MAX_BYTES),
  exile_string: maxUtf8Bytes(DECK_EXILE_STRING_MAX_BYTES).nullish(),
  ignoreDeckLimitSlots: SafeSlotsSchema,
  id: DeckIdSchema,
  investigator_code: z.string(),
  investigator_name: z.string().nullish(),
  meta: z.string(),
  name: z.string(),
  next_deck: DeckIdSchema.nullish(),
  previous_deck: DeckIdSchema.nullish(),
  problem: z
    .union([DeckProblemSchema, z.string().max(DECK_PROBLEM_MAX_LENGTH)])
    .nullish(),
  sideSlots: SafeSlotsSchema,
  slots: SlotsSchema,
  source: StorageProviderSchema,
  taboo_id: z.number().nullish(),
  tags: maxUtf8Bytes(DECK_TAGS_MAX_BYTES),
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

export type DeckFanMadeContent = {
  cards: Record<string, Card>;
  cycles: Record<string, Cycle>;
  encounter_sets: Record<string, EncounterSet>;
  packs: Record<string, Pack>;
};

export type DeckFanMadeContentSlots = {
  slots: Slots;
  sideSlots: Slots | null;
  ignoreDeckLimitSlots: Slots | null;
  investigator_code: string | null;
};

export type DeckMeta = {
  alternate_back?: string | null;
  alternate_front?: string | null;
  buildql_deck_options_override?: string | null;
  card_pool?: string | null;
  deck_card_tags?: string | null;
  deck_size_selected?: string | null;
  extra_deck?: string | null;
  fan_made_content?: DeckFanMadeContent;
  hidden_slots?: DeckFanMadeContentSlots;
  faction_1?: string | null;
  faction_2?: string | null;
  faction_selected?: string | null;
  option_selected?: string | null;
  sealed_deck_name?: string | null;
  sealed_deck?: string | null;
  transform_into?: string | null;
  banner_url?: string | null;
  intro_md?: string | null;
} & {
  [key in `cus_${string}`]: string | null;
} & {
  [key in `attachments_${string}`]: string | null;
} & {
  [key in `annotation_${string}`]: string | null;
} & {
  [key in `card_pool_extension_${string}`]: string | null;
} & {
  [key in `custom_behavior:${string}`]: string | null;
};
