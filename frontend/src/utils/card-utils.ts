import type { TFunction } from "i18next";
import type { Card } from "@/store/schemas/card.schema";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import {
  CYCLES_WITH_STANDALONE_PACKS,
  ORIENTATION_CHANGED_CARDS,
  REGEX_USES,
  SIDEWAYS_TYPE_CODES,
  SKILL_KEYS,
} from "./constants";
import { isEmpty } from "./is-empty";

export function splitMultiValue(s: string | null | undefined) {
  if (!s) return [];
  return s.split(".").reduce<string[]>((acc, curr) => {
    const s = curr.trim();
    if (s) acc.push(s);
    return acc;
  }, []);
}

export function hasSkillIcons(card: Card) {
  return SKILL_KEYS.some((key) => card[`skill_${key}`]);
}

export function getCardColor(card: Card, prop = "color") {
  return card.faction2_code
    ? `${prop}-multiclass`
    : `${prop}-${card.faction_code}`;
}

export function sideways(card: Card) {
  const value = SIDEWAYS_TYPE_CODES.includes(card.type_code);
  return ORIENTATION_CHANGED_CARDS.includes(card.code) ? !value : value;
}

function doubleSided(card: Card) {
  return card.double_sided || card.back_link_id;
}

type CardBackType =
  | "player"
  | "encounter"
  | "card"
  | "the_longest_night"
  | "artifact"
  | "cthulhu_deck";

export function cardBackType(card: Card): CardBackType {
  if (doubleSided(card)) return "card";

  if (card.back_type) return card.back_type as CardBackType;

  if (
    card.faction_code === "mythos" ||
    (card.encounter_code && !card.deck_limit)
  ) {
    return "encounter";
  }

  return "player";
}

export function cardBackTypeUrl(type: CardBackType) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/back_${type}.jpg`;
}

export function reversed(card: Card) {
  return (
    card.double_sided &&
    isLocationLike(card) &&
    !card.back_link_id &&
    card.encounter_code
  );
}

export function countExperience(card: Card, quantity: number) {
  if (card.customization_xp) return card.customization_xp;

  let xp = card.xp ?? 0;
  if (card.exceptional) xp *= 2;
  if (card.taboo_xp) xp += card.taboo_xp;

  return xp * (card.myriad ? Math.min(quantity, 1) : quantity);
}

export function cardLevel(card: Card) {
  return card.customization_xp
    ? Math.round(card.customization_xp / 2)
    : card.xp;
}

/**
 * Get the "real" card level after applying taboo.
 * For the sake of deckbuilding, cards keep their original level + an xp change.
 * However, for the sake of XP calculations and interactions such as "Adaptable",
 * cards should be considered their updated level in the spirit of the taboo.
 * This prevents weirdness such as Adaptable being able to swap in Drawing Thin for free.
 */
export function realCardLevel(card: Card) {
  const level = cardLevel(card);
  if (level == null) return level;
  return level + (card.taboo_xp ?? 0);
}

export function imageUrl(code: string) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/optimized/${code}.avif`;
}

export function thumbnailUrl(code: string) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/thumbnails/${code}.avif`;
}

export function parseCardTextHtml(
  cardText: string,
  opts?: {
    bullets?: boolean;
    newLines?: "replace" | "skip";
  },
) {
  let parsed = cardText;

  if (opts?.bullets) {
    parsed = parsed.replaceAll(/^\s?(-|–)/gm, `<i class="icon-bullet"></i>`);
  }

  parsed = parsed
    .replaceAll(/\[\[(.*?)\]\]/g, "<b><em>$1</em></b>")
    .replaceAll(/\[((?:\w|_)+?)\]/g, `<i class="icon-$1"></i>`);

  if (opts?.newLines !== "skip") {
    parsed = parsed.replaceAll("\n", "<hr class='break'>");
  }

  return parsed;
}

export function parseCustomizationTextHtml(customizationText: string) {
  return parseCardTextHtml(customizationText).replaceAll(/□/g, "");
}

export function parseCardTitle(title: string) {
  return title.replaceAll(/\[((?:\w|_)+?)\]/g, `<i class="icon-$1"></i>`);
}

export function decodeExileSlots(s: string | null | undefined) {
  const ids = s?.split(",").filter((x) => x);
  if (!ids?.length) return {};

  return (
    ids.reduce<Record<string, number>>((acc, curr) => {
      acc[curr] ??= 0;
      acc[curr] += 1;
      return acc;
    }, {}) ?? {}
  );
}

export function isSpecialCard(card: Card, ignorePermanent = false) {
  const isSpecial = card.encounter_code || card.subtype_code || card.xp == null;

  return !!isSpecial || !!(card.permanent && !ignorePermanent);
}

export function isEnemyLike(card: Card) {
  return card.type_code === "enemy" || card.type_code === "enemy_location";
}

function isLocationLike(card: Card) {
  return card.type_code === "location" || card.type_code === "enemy_location";
}

export function getCanonicalCardCode(card: Card) {
  return card.duplicate_of_code ?? card.alternate_of_code ?? card.code;
}

export function isRandomBasicWeaknessLike(card: Card) {
  return (
    card.subtype_code === "basicweakness" ||
    (card.subtype_code === "weakness" &&
      !card.encounter_code &&
      !card.restrictions)
  );
}

/**
 * A static investigator is one that can not build decks. (Y'thian, Lost Homunculus)
 */
export function isStaticInvestigator(card: Card) {
  return card.type_code === "investigator" && !card.deck_options;
}

export function isSpecialist(c: Card) {
  return Array.isArray(c.restrictions?.trait) && !isEmpty(c.restrictions.trait);
}

export function cardLimit(card: Card, limitOverride?: number) {
  return limitOverride ?? card.deck_limit ?? 0;
}

export function cardUses(card: Card) {
  const firstLine = card.real_text?.split("\n").at(0);
  const match = firstLine?.match(REGEX_USES);

  if (match?.length) {
    const uses = match[1].toLowerCase();
    return uses === "charge" ? "charges" : uses;
  }

  return undefined;
}

export function displayAttribute(
  card: Card | undefined,
  key:
    | "text"
    | "name"
    | "traits"
    | "flavor"
    | "subname"
    | "back_name"
    | "back_traits"
    | "back_flavor"
    | "back_subname"
    | "back_text"
    | "taboo_text_change"
    | "customization_text"
    | "customization_change",
) {
  return card?.[key] ?? card?.[`real_${key}`] ?? "";
}

export function cycleOrPack(cycle: Cycle, pack: Pack) {
  if (
    !official(pack) ||
    CYCLES_WITH_STANDALONE_PACKS.includes(cycle.code) ||
    pack.real_name.includes("Investigator Expansion") ||
    pack.real_name.includes("Campaign Expansion")
  ) {
    return pack;
  }

  return cycle;
}

export function numericalIcon(num: string | number | null | undefined) {
  if (num == null) return "icon-numNull";
  if (num === -2) return "icon-x";
  if (num === -3) return "icon-star";
  if (num === -4) return "x-icon-question-mark";
  return `icon-num${num}`;
}

export function numericalStr(num: string | number | null | undefined) {
  if (num == null) return "-";
  if (num === -2) return "X";
  if (num === -3) return "*";
  if (num === -4) return "?";
  return `${num}`;
}

export function official(card: Card | Pack | Cycle) {
  return card.official !== false;
}

export function cardUrl(card: Card) {
  return `~/card/${card.code}`;
}

export function oldFormatCardUrl(card: Card) {
  const baseUrl = cardUrl(card);
  return `${baseUrl}?old_format=true`;
}

export function canShowCardPoolExtension(card: Card) {
  return card.card_pool_extension && !card.card_pool_extension.selections;
}

export function doubleSidedBackCard(card: Card, t: TFunction) {
  if (!card.double_sided) return undefined;

  const { clues: _, doom: __, shroud: ___, ...attributes } = card;

  const nameFallback = t("common.card_back", {
    name: displayAttribute(card, "name"),
  });

  return {
    ...attributes,
    name: displayAttribute(card, "back_name") || nameFallback,
    real_name: card.real_back_name || nameFallback,
    subname: displayAttribute(card, "back_subname"),
    real_subname: card.real_back_subname,
    flavor: displayAttribute(card, "back_flavor"),
    real_flavor: card.real_back_flavor,
    illustrator: card.back_illustrator,
    text: displayAttribute(card, "back_text"),
    real_text: card.real_back_text,
    traits:
      displayAttribute(card, "back_traits") || displayAttribute(card, "traits"),
    real_traits: card.real_back_traits || card.real_traits,
  };
}
