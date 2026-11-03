import { z } from "zod";
import type {
  ApiDeckRequirements,
  ApiRestrictions,
} from "../schemas/card.schema.ts";

const DeckSizeSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative());

const FieldValueSchema = z.string().trim().min(1);

const RandomRequirementSchema = z.tuple([FieldValueSchema, FieldValueSchema]);
const CardCodesSchema = z.tuple([FieldValueSchema]).rest(FieldValueSchema);

export function decodeRestrictions(
  value: string | null | undefined,
): ApiRestrictions | undefined {
  return value?.split(", ").reduce((acc: ApiRestrictions, item: string) => {
    const key = item.substring(0, item.indexOf(":"));
    const entryValue = item.substring(item.indexOf(":") + 1);

    if (key === "investigator") {
      const result = CardCodesSchema.safeParse(entryValue.split(":"));
      if (!result.success) return acc;

      acc.investigator ??= {};
      for (const investigator of result.data) {
        acc.investigator[investigator] = investigator;
      }
    }

    if (key === "trait" || key === "faction") {
      const result = FieldValueSchema.safeParse(entryValue);
      if (!result.success) return acc;

      acc[key] ??= [];
      acc[key].push(result.data);
    }

    return acc;
  }, {} as ApiRestrictions);
}

export function decodeDeckRequirements(
  value?: string | null,
): ApiDeckRequirements | undefined {
  return value?.split(", ").reduce((acc: ApiDeckRequirements, item: string) => {
    const key = item.substring(0, item.indexOf(":"));
    const entryValue = item.substring(item.indexOf(":") + 1);

    if (key === "size") {
      const result = DeckSizeSchema.safeParse(entryValue);
      if (result.success) acc.size = result.data;
    }

    if (key === "random") {
      const result = RandomRequirementSchema.safeParse(entryValue.split(":"));
      if (!result.success) return acc;

      const [target, randomValue] = result.data;
      acc.random ??= [];
      acc.random.push({ target, value: randomValue });
    }

    if (key === "card") {
      const result = CardCodesSchema.safeParse(entryValue.split(":"));
      if (!result.success) return acc;

      const [cardCode] = result.data;
      acc.card ??= {};
      acc.card[cardCode] = Object.fromEntries(
        result.data.map((code) => [code, code]),
      );
    }

    return acc;
  }, {} as ApiDeckRequirements);
}
