import { z } from "zod";

export const DecklistMetaResponseSchema = z.object({
  date_creation: z.string(),
  description_word_count: z.coerce.number().int().min(0),
  like_count: z.coerce.number().int().min(0),
  user_id: z.coerce.number().int().min(1),
  user_name: z.string(),
  user_reputation: z.coerce.number().int().min(0),
});

export type DecklistMetaResponse = z.infer<typeof DecklistMetaResponseSchema>;
