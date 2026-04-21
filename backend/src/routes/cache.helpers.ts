import assert from "node:assert";
import type {
  ApiDeckRequirements,
  ApiRestrictions,
} from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type { Card } from "../db/schema.types.ts";
import type { WithItemTranslations } from "../tasks/ingest/lib/json-data.types.ts";

export function getVersionForLocale(db: Database, locale: string) {
  return db
    .selectFrom("data_version")
    .selectAll()
    .where("locale", "=", locale)
    .executeTakeFirstOrThrow();
}

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

export function applyTranslations<T>(
  input: WithItemTranslations<T>,
  locale: string,
) {
  const match: Record<string, unknown> | undefined = input.translations.find(
    (t) => t.locale === locale,
  );

  const out: Record<string, unknown> = structuredClone(input);
  delete out["translations"];

  for (const key of TRANSLATED_KEYS) {
    out[`real_${key}`] = out[key];
    if (match?.[key]) {
      out[key] = match[key];
    } else {
      delete out[key];
    }
  }

  return out;
}

export function formatAsLegacyApiCard(card: Selectable<Card>) {
  const next: Record<string, unknown> = {};

  for (const key of Object.keys(card)) {
    if (key === "bonded_to" || key === "bonded_count") continue;

    const val = card[key as keyof Card];

    if (val != null && val !== false) {
      next[key] = val;
    }
  }

  if (card.tags) {
    const tags = decodeTags(card.tags);
    if (tags.includes("hd")) next["heals_damage"] = true;
    if (tags.includes("hh")) next["heals_horror"] = true;
    next["tags"] = tags;
  }

  if (card.customization_options) {
    next["customization_options"] = (
      card.customization_options as { tags?: string }[]
    ).map((o) => {
      if (!o.tags) return o;
      const tags = decodeTags(o.tags);
      if (tags.includes("hd")) next["heals_damage"] = true;
      if (tags.includes("hh")) next["heals_horror"] = true;
      return { ...o, tags };
    });
  }

  if (card.errata_date) {
    next["errata_date"] = card.errata_date.toISOString().slice(0, 10);
  }

  if (card.restrictions) {
    next["restrictions"] = decodeRestrictions(card.restrictions);
  }

  if (card.deck_requirements) {
    next["deck_requirements"] = decodeDeckRequirements(card.deck_requirements);
  }

  if (card.side_deck_requirements) {
    next["side_deck_requirements"] = decodeDeckRequirements(
      card.side_deck_requirements,
    );
  }

  if (card.duplicate_of) {
    next["duplicate_of_code"] = card.duplicate_of;
    delete next["duplicate_of"];
  }

  if (card.alternate_of) {
    next["alternate_of_code"] = card.alternate_of;
    delete next["alternate_of"];
  }

  if (card.back_link) {
    next["back_link_id"] = card.back_link;
    delete next["back_link"];
  }

  if (
    card.type_code === "investigator" &&
    (card.code.startsWith("90") ||
      card.code.startsWith("98") ||
      card.code.startsWith("99") ||
      card.bonded_to)
  ) {
    next["alt_art_investigator"] = true;
  }

  return next as Selectable<Card>;
}

function decodeTags(tags: string) {
  return tags.split(".").map((t: string) => t.trim());
}

type Restrictions = ApiRestrictions;

function decodeRestrictions(
  str: string | null | undefined,
): Restrictions | undefined {
  return str?.split(", ").reduce((acc: Restrictions, curr: string) => {
    const key = curr.substring(0, curr.indexOf(":"));
    const val = curr.substring(curr.indexOf(":") + 1);

    if (key === "investigator") {
      acc.investigator ??= {};
      const values = val.split(":");
      for (const val of values) {
        acc.investigator[val] = val;
      }
    }

    if (key === "trait") {
      acc.trait ??= [];
      acc.trait.push(val);
    }

    if (key === "faction") {
      acc.faction ??= [];
      acc.faction.push(val);
    }

    return acc;
  }, {} as Restrictions);
}

function decodeDeckRequirements(
  str?: string | null,
): ApiDeckRequirements | undefined {
  return str?.split(", ").reduce((acc: ApiDeckRequirements, curr: string) => {
    const key = curr.substring(0, curr.indexOf(":"));
    const val = curr.substring(curr.indexOf(":") + 1);

    if (key === "size") {
      acc.size = Number.parseInt(val, 10);
    }

    if (key === "random") {
      const [target, value] = val.split(":");
      assert(target && value, `Invalid random deck requirement: ${curr}`);
      acc.random ??= [];
      acc.random.push({ target, value });
    }

    if (key === "card") {
      acc.card ??= {};

      const values = val.split(":");
      assert(values[0], `Invalid random deck requirement: ${curr}`);

      acc.card[values[0]] = values.reduce<Record<string, string>>(
        (acc, curr) => {
          acc[curr] = curr;
          return acc;
        },
        {},
      );
    }

    return acc;
  }, {} as ApiDeckRequirements);
}
