import { z } from "zod";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

const JsonPrimitiveSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.null(),
]);

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

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
