import type { Card } from "@arkham-build/shared";
import type { i18n } from "i18next";
import type { Metadata } from "@/store/slices/metadata.types";
import type { LookupTables } from "../lookup-tables.types";
import type { ResolvedDeck } from "../types";

export type FieldValue =
  | string
  | FieldValue[]
  | number
  | boolean
  | null
  | undefined;

export type FieldType = "string" | "text" | "number" | "boolean";

export type FieldLookupContext = {
  deck: ResolvedDeck | undefined;
  i18n: i18n;
  lookupTables: LookupTables;
  matchBacks: boolean;
  metadata: Metadata;
};

export type ComparisonContext = {
  operator?: string;
  otherValue?: FieldValue | RegExp | (FieldValue | RegExp)[];
};

export type FieldLookup = (
  card: Card,
  context: FieldLookupContext,
  comparisonContext?: ComparisonContext,
) => FieldValue;

export interface FieldDescriptor {
  lookup: FieldLookup;
  type: FieldType;
}

export type InterpreterContext = {
  fields: Record<string, FieldDescriptor>;
  fieldLookupContext: FieldLookupContext;
};
