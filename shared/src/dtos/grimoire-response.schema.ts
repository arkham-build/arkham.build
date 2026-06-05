import { z } from "zod";
import {
  ErrataSchema,
  JsonDataErrataSchema,
} from "../schemas/errata.schema.ts";
import { FaqSchema } from "../schemas/faq.schema.ts";
import {
  GrimoireEntrySchema,
  GrimoireSectionSchema,
} from "../schemas/grimoire.schema.ts";

export const CardErrataResponseSchema = z.array(ErrataSchema);
export type CardErrataResponse = z.infer<typeof CardErrataResponseSchema>;

export const CardFaqResponseSchema = z.array(FaqSchema);
export type CardFaqResponse = z.infer<typeof CardFaqResponseSchema>;

export const GrimoireResponseSchema = z.object({
  entries: z.array(GrimoireEntrySchema),
  errata: z.array(JsonDataErrataSchema),
  faq: z.array(FaqSchema),
  sections: z.array(GrimoireSectionSchema),
});

export type GrimoireResponse = z.infer<typeof GrimoireResponseSchema>;
