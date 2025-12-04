import { z } from "zod";

export const arkhamdbDecklistSchema = z.object({
  canonical_investigator_code: z.string(),
  date_creation: z.date(),
  date_update: z.date().nullable(),
  description_md: z.string().nullable(),
  exile_string: z.string().nullable(),
  id: z.number(),
  ignore_deck_limit_slots: z.record(z.string(), z.number()).nullable(),
  investigator_code: z.string(),
  investigator_name: z.string(),
  like_count: z.number(),
  meta: z.preprocess((val) => JSON.stringify(val), z.string()).nullable(), // backwards compatibility
  name: z.string(),
  next_deck: z.number().nullable(),
  previous_deck: z.number().nullable(),
  side_slots: z.record(z.string(), z.number()).nullable(),
  slots: z.record(z.string(), z.number()),
  taboo_id: z.number().nullable(),
  tags: z.string().nullable(),
  user_id: z.number(),
  version: z.string().nullable(),
  xp: z.number().nullable(),
  xp_adjustment: z.number().nullable(),
  xp_spent: z.number().nullable(),
});
