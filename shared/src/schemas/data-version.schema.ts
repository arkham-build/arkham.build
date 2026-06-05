import { z } from "zod";

export const DataVersionSchema = z.object({
  card_count: z.number(),
  cards_updated_at: z.string(),
  ingested_commit_id: z.string().nullish(),
  locale: z.string(),
  metadata_version: z.number(),
  translation_updated_at: z.string(),
});

export type DataVersion = z.infer<typeof DataVersionSchema>;
