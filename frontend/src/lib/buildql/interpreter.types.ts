import type { Card } from "@/store/schemas/card.schema";

export type FieldValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;

export type FieldType = "string" | "text" | "number" | "boolean";

export type FieldLookup = (card: Card) => FieldValue;

export interface FieldDescriptor {
  lookup: FieldLookup;
  type: FieldType;
}

export type InterpreterContext = {
  lookups: Record<string, FieldDescriptor>;
  fuzzyMatcher: (haystack: string, needle: string) => boolean;
  locale?: string;
};
