import { z } from "zod";

export const JsonDataTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type JsonDataType = z.infer<typeof JsonDataTypeSchema>;

export const JsonDataSubtypeSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type JsonDataSubtype = z.infer<typeof JsonDataSubtypeSchema>;

export const JsonDataFactionSchema = z.object({
  code: z.string(),
  name: z.string(),
  is_primary: z.boolean(),
});

export type JsonDataFaction = z.infer<typeof JsonDataFactionSchema>;
