import type { Card } from "@/store/schemas/card.schema";

export type FieldValue = string | number | boolean | null | undefined;

export type FieldLookup = (card: Card) => FieldValue;

export type InterpreterContext = {
  lookups: Record<string, FieldLookup>;
};
