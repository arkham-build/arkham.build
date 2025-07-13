import * as z from "zod/v4-mini";

const FactionSchema = z.object({
  code: z.string(),
  is_primary: z.boolean(),
  name: z.string(),
});

const SubTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  position: z.optional(z.number()),
});

const TypeSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type Faction = z.infer<typeof FactionSchema>;
export type SubType = z.infer<typeof SubTypeSchema>;
export type Type = z.infer<typeof TypeSchema>;
