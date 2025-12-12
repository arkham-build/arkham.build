import type { TFunction } from "i18next";
import type { Card } from "@/store/schemas/card.schema";
import type { Metadata } from "@/store/slices/metadata.types";

export type FieldValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;

export type FieldType = "string" | "text" | "number" | "boolean";

export type FieldLookupContext = {
  t: TFunction;
  metadata: Metadata;
};

export type FieldLookup = (
  card: Card,
  context: FieldLookupContext,
) => FieldValue;

export interface FieldDescriptor {
  lookup: FieldLookup;
  type: FieldType;
}

export type InterpreterContext = {
  fields: Record<string, FieldDescriptor>;
  fieldLookupContext: FieldLookupContext;
};
