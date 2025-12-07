import { z } from "zod";
import {
  coerceStringArray,
  coerceStringBoolean,
} from "../lib/search-params.ts";
import { DateRangeSchema } from "./date-range.schema.ts";

export const DecklistSearchRequestSchema = z.object({
  analyze_side_decks: z
    .preprocess(coerceStringBoolean, z.boolean())
    .default(false),
  author_name: z.string().max(255).optional(),
  canonical_investigator_code: z.string().optional(),
  description_length: z.coerce.number().int().min(0).max(1000).optional(),
  date_range: DateRangeSchema.nullish(),
  excluded: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  investigator_factions: z
    .preprocess(coerceStringArray, z.array(z.string()))
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  name: z.string().max(255).optional(),
  offset: z.coerce.number().int().min(0).optional().default(0),
  required: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  sort_by: z
    .enum(["user_reputation", "date", "likes", "popularity"])
    .default("popularity"),
  sort_dir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type DecklistSearchRequest = z.infer<typeof DecklistSearchRequestSchema>;
