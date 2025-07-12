import * as z from "zod/v4-mini";

const RecommendationSchema = z.object({
  card_code: z.string(),
  recommendation: z.number(),
  ordering: z.number(),
  explanation: z.string(),
});

const RecommendationsSchema = z.object({
  decks_analyzed: z.number(),
  recommendations: z.array(RecommendationSchema),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
export type Recommendations = z.infer<typeof RecommendationsSchema>;
