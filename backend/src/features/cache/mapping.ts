import assert from "node:assert";
import type {
  ApiCard,
  ApiDeckRequirements,
  ApiRestrictions,
} from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { Card } from "../../db/schema.types.ts";
import type { ItemTranslation } from "../../lib/json-data.types.ts";

const TRANSLATED_KEYS = [
  "back_flavor",
  "back_name",
  "back_subname",
  "back_text",
  "back_traits",
  "customization_change",
  "customization_text",
  "flavor",
  "name",
  "slot",
  "subname",
  "taboo_text_change",
  "text",
  "traits",
];

export function applyLocaleTranslations<T>(
  input: T & { translations?: ItemTranslation<T>[] },
  locale: string,
) {
  const match: Record<string, unknown> | undefined = input.translations?.find(
    (translation) => translation.locale === locale,
  );

  const output: Record<string, unknown> = structuredClone(input);
  delete output["translations"];

  for (const key of TRANSLATED_KEYS) {
    output[`real_${key}`] = output[key];
    if (match?.[key]) {
      output[key] = match[key];
    } else {
      delete output[key];
    }
  }

  return output;
}

export function mapCardRowToV1Card(card: Selectable<Card>) {
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(card)) {
    if (key === "bonded_to" || key === "bonded_count") continue;

    const value = card[key as keyof Card];

    if (value != null && value !== false) {
      output[key] = value;
    }
  }

  if (card.tags) {
    const tags = decodeTags(card.tags);
    if (tags.includes("hd")) output["heals_damage"] = true;
    if (tags.includes("hh")) output["heals_horror"] = true;
    output["tags"] = tags;
  }

  if (card.customization_options) {
    output["customization_options"] = (
      card.customization_options as { tags?: string }[]
    ).map((option) => {
      if (!option.tags) return option;
      const tags = decodeTags(option.tags);
      if (tags.includes("hd")) output["heals_damage"] = true;
      if (tags.includes("hh")) output["heals_horror"] = true;
      return { ...option, tags };
    });
  }

  if (card.errata_date) {
    output["errata_date"] = card.errata_date.toISOString().slice(0, 10);
  }

  if (card.restrictions) {
    output["restrictions"] = decodeRestrictions(card.restrictions);
  }

  if (card.deck_requirements) {
    output["deck_requirements"] = decodeDeckRequirements(
      card.deck_requirements,
    );
  }

  if (card.side_deck_requirements) {
    output["side_deck_requirements"] = decodeDeckRequirements(
      card.side_deck_requirements,
    );
  }

  if (card.duplicate_of) {
    output["duplicate_of_code"] = card.duplicate_of;
    delete output["duplicate_of"];
  }

  if (card.alternate_of) {
    output["alternate_of_code"] = card.alternate_of;
    delete output["alternate_of"];
  }

  if (card.back_link) {
    output["back_link_id"] = card.back_link;
    delete output["back_link"];
  }

  if (
    card.type_code === "investigator" &&
    (card.code.startsWith("90") ||
      card.code.startsWith("98") ||
      card.code.startsWith("99") ||
      card.bonded_to)
  ) {
    output["alt_art_investigator"] = true;
  }

  return output as ApiCard;
}

function decodeTags(tags: string) {
  return tags.split(".").map((tag) => tag.trim());
}

type Restrictions = ApiRestrictions;

function decodeRestrictions(
  value: string | null | undefined,
): Restrictions | undefined {
  return value?.split(", ").reduce((acc: Restrictions, item: string) => {
    const key = item.substring(0, item.indexOf(":"));
    const entryValue = item.substring(item.indexOf(":") + 1);

    if (key === "investigator") {
      acc.investigator ??= {};
      const values = entryValue.split(":");
      for (const investigator of values) {
        acc.investigator[investigator] = investigator;
      }
    }

    if (key === "trait") {
      acc.trait ??= [];
      acc.trait.push(entryValue);
    }

    if (key === "faction") {
      acc.faction ??= [];
      acc.faction.push(entryValue);
    }

    return acc;
  }, {} as Restrictions);
}

function decodeDeckRequirements(
  value?: string | null,
): ApiDeckRequirements | undefined {
  return value?.split(", ").reduce((acc: ApiDeckRequirements, item: string) => {
    const key = item.substring(0, item.indexOf(":"));
    const entryValue = item.substring(item.indexOf(":") + 1);

    if (key === "size") {
      acc.size = Number.parseInt(entryValue, 10);
    }

    if (key === "random") {
      const [target, randomValue] = entryValue.split(":");
      assert(target && randomValue, `Invalid random deck requirement: ${item}`);
      acc.random ??= [];
      acc.random.push({ target, value: randomValue });
    }

    if (key === "card") {
      acc.card ??= {};

      const values = entryValue.split(":");
      assert(values[0], `Invalid random deck requirement: ${item}`);

      acc.card[values[0]] = values.reduce<Record<string, string>>(
        (next, current) => {
          next[current] = current;
          return next;
        },
        {},
      );
    }

    return acc;
  }, {} as ApiDeckRequirements);
}
