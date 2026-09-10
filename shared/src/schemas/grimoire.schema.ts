import { z } from "zod";

export const GrimoireEntrySchema = z.object({
  citation: z.string(),
  id: z.string(),
  references: z.array(z.string()).nullish(),
  section: z.string(),
  text: z.string().nullish(),
  title: z.string(),
});

export type GrimoireEntry = z.infer<typeof GrimoireEntrySchema>;

export const GrimoireSectionSchema = z.object({
  citation: z.string().nullish(),
  id: z.string(),
  position: z.number().int(),
  text: z.string().nullish(),
  title: z.string(),
});

export type GrimoireSection = z.infer<typeof GrimoireSectionSchema>;
