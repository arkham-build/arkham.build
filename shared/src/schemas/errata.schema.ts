import { z } from "zod";

export const JsonDataErrataSchema = z.discriminatedUnion("type", [
  z.object({
    citation: z.string(),
    cycles: z.array(z.string()).nullish(),
    ruling: z.string(),
    scenario_codes: z.array(z.string()).nullish(),
    type: z.literal("campaign_errata"),
  }),
  z.object({
    card_codes: z.array(z.string()).nullish(),
    citation: z.string(),
    ruling: z.string(),
    type: z.literal("card_errata"),
  }),
  z.object({
    ruling: z.string(),
    section: z.string(),
    citation: z.string(),
    type: z.literal("rulebook_errata"),
  }),
]);

export type JsonDataErrata = z.infer<typeof JsonDataErrataSchema>;

export const ErrataSchema = JsonDataErrataSchema.and(
  z.object({
    id: z.number(),
    position: z.number(),
  }),
);

export type Errata = z.infer<typeof ErrataSchema>;
