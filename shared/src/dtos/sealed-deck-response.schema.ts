import { z } from "zod";

export const SealedDeckResponseSchema = z.object({
  cards: z.record(z.string(), z.number()),
  name: z.string(),
});

export type SealedDeckResponse = z.infer<typeof SealedDeckResponseSchema>;
