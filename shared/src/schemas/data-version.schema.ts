import { z } from "zod";

export const DataVersionSchema = z.object({
  card_count: z.number(),
  cards_updated_at: z.string(),
  ingested_commit_id: z.string(),
  locale: z.string(),
  translation_updated_at: z.string(),
});

export type DataVersion = z.infer<typeof DataVersionSchema>;
