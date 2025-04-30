import type { Card, Cycle, Pack } from "@/store/services/queries.types";
import {
  CYCLES_WITH_STANDALONE_PACKS,
  ORIENTATION_CHANGED_CARDS,
  PLAYER_CARDS_ENCOUNTER_BACK_IDS,
  REGEX_USES,
  SIDEWAYS_TYPE_CODES,
  SKILL_KEYS,
} from "./constants";
import { isEmpty } from "./is-empty";

export function splitMultiValue(s?: string) {
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
  | "longest_night"
  | "artifact"
  | "cthulhu";

export function cardBackType(card: Card): CardBackType {
  if (doubleSided(card)) return "card";

  if (card.faction_code === "mythos") {
    // longest night enemy deck
    if (
      card.encounter_code === "the_longest_night" &&
      card.type_code === "enemy"
    ) {
      return "longest_night";
    }

    // cthulhu deck
    if (
      card.encounter_code === "the_doom_of_arkham_part_2" &&
      card.type_code === "story"
    ) {
      return "cthulhu";
    }

    return "encounter";
  }

  // tdc artifacts
  if (card.pack_code === "tdcc" && card.real_traits?.includes("Artifact")) {
    return "artifact";
  }

  if (
    // Cards from investigator expansions that have an encounter back.
    PLAYER_CARDS_ENCOUNTER_BACK_IDS.includes(card.code) ||
    // Campaign assets that don't go in player decks have encounter back.
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
  },
) {
  let parsed = cardText;

  if (opts?.bullets) {
    parsed = parsed.replaceAll(/^\s?(-|–)/gm, `<i class="icon-bullet"></i>`);
  }

  parsed = parsed
    .replaceAll("\n", "<hr class='break'>")
    .replaceAll(/\[\[(.*?)\]\]/g, "<b><em>$1</em></b>")
    .replaceAll(/\[((?:\w|_)+?)\]/g, `<i class="icon-$1"></i>`);

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
    return match[1] === "charge" ? "charges" : match[1];
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
    | "back_text"
    | "taboo_text_change"
    | "customization_text"
    | "customization_change",
) {
  return card?.[key] ?? card?.[`real_${key}`] ?? "";
}

export function cycleOrPack(cycle: Cycle, pack: Pack) {
  if (
    CYCLES_WITH_STANDALONE_PACKS.includes(cycle.code) ||
    pack.real_name.includes("Investigator Expansion") ||
    pack.real_name.includes("Campaign Expansion")
  ) {
    return pack;
  }

  return cycle;
}
