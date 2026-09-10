import { z } from "zod";

export const JsonDataFaqSchema = z.object({
  type: z.literal("faq"),
  card_codes: z.array(z.string()).nullish(),
  cycles: z.array(z.string()).nullish(),
  scenario_codes: z.array(z.string()).nullish(),
  question: z.string(),
  ruling: z.string(),
  citation: z.string(),
});

export type JsonDataFaq = z.infer<typeof JsonDataFaqSchema>;

export const FaqSchema = JsonDataFaqSchema.extend({
  id: z.number(),
  position: z.number(),
});

export type Faq = z.infer<typeof FaqSchema>;
