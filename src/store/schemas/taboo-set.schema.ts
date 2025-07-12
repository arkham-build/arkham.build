import * as z from "zod/v4-mini";

const TabooSetSchema = z.object({
  id: z.number(),
  name: z.string(),
  card_count: z.number(),
  date: z.string(),
});

export type TabooSet = z.infer<typeof TabooSetSchema>;
