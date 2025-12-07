import { z } from "zod";

export const RecommendationSchema = z.object({
  card_code: z.string().max(72),
  recommendation: z.number(),
  decks_matched: z.number().optional(),
});

export const RecommendationsResponseSchema = z.object({
  data: z.object({
    recommendations: z.object({
      decks_analyzed: z.number(),
      recommendations: z.array(RecommendationSchema),
    }),
  }),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export type RecommendationsResponse = z.infer<
  typeof RecommendationsResponseSchema
>;
