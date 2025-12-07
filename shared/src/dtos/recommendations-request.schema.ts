import { z } from "zod";
import {
  coerceStringArray,
  coerceStringBoolean,
} from "../lib/search-params.ts";
import { DateRangeSchema } from "./date-range.schema.ts";

export const RecommendationsRequestSchema = z.object({
  analysis_algorithm: z
    .enum(["absolute_rank", "percentile_rank"])
    .optional()
    .default("absolute_rank"),
  analyze_side_decks: z
    .preprocess(coerceStringBoolean, z.boolean())
    .optional()
    .default(true),
  author_name: z.string().max(255).optional(),
  canonical_investigator_code: z.string(),
  date_range: DateRangeSchema,
  required_cards: z
    .preprocess(coerceStringArray, z.array(z.string()))
    .optional()
    .default([]),
});

export type RecommendationsRequest = z.infer<
  typeof RecommendationsRequestSchema
>;
