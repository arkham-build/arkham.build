import type { i18n } from "i18next";
import type { Card } from "@/store/schemas/card.schema";
import type { Metadata } from "@/store/slices/metadata.types";

export type FieldValue =
  | string
  | FieldValue[]
  | number
  | boolean
  | null
  | undefined;

export type FieldType = "string" | "text" | "number" | "boolean";

export type FieldLookupContext = {
  i18n: i18n;
  matchBacks: boolean;
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
