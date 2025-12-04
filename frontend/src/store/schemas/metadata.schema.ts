import * as z from "zod";

const FactionSchema = z.object({
  code: z.string(),
  is_primary: z.boolean(),
  name: z.string(),
});

const SubTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  position: z.number().nullish(),
});

const TypeSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type Faction = z.infer<typeof FactionSchema>;
export type SubType = z.infer<typeof SubTypeSchema>;
export type Type = z.infer<typeof TypeSchema>;
