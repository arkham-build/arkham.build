import {
  CardTagSchema,
  type CardTagsState,
  normalizeCardTagName,
} from "@arkham-build/shared";
import type { Metadata } from "../slices/metadata.types";
import type { LookupTables } from "./lookup-tables.types";

type FrontCardLookup = LookupTables["relations"]["fronts"];

const CARD_TAG_FILTER_TAG_PREFIX = "tag:";

export function getEmptyCardTagsState(): CardTagsState {
  return {
    tags: [],
    cardTags: {},
    favorites: {},
  };
}

export function canonicalizeCardTagsState(
  state: CardTagsState,
  metadata: Metadata,
  fronts: FrontCardLookup,
): CardTagsState {
  const cardTags: CardTagsState["cardTags"] = {};
  const favorites: CardTagsState["favorites"] = {};

  for (const [cardCode, tagNames] of Object.entries(state.cardTags)) {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagNames = cardTags[canonicalCode] ?? [];
    const seen = new Set(assignedTagNames);

    for (const tagName of tagNames) {
      if (seen.has(tagName)) continue;

      seen.add(tagName);
      assignedTagNames.push(tagName);
    }

    if (assignedTagNames.length) {
      cardTags[canonicalCode] = assignedTagNames;
    }
  }

  for (const cardCode of Object.keys(state.favorites)) {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    favorites[canonicalCode] = true;
  }

  return {
    tags: state.tags,
    cardTags,
    favorites,
  };
}

export function resolveCardTagCardCode(
  metadata: Metadata,
  fronts: FrontCardLookup,
  code: string,
): string {
  let currentCode = code;
  const visited = new Set<string>();

  while (!visited.has(currentCode)) {
    visited.add(currentCode);

    const card = metadata.cards[currentCode];
    if (!card) return currentCode;

    const frontCode = getFirstLookupKey(fronts[currentCode]);
    if (frontCode) {
      currentCode = frontCode;
      continue;
    }

    if (!card.duplicate_of_code) return currentCode;
    if (!metadata.cards[card.duplicate_of_code]) return currentCode;

    currentCode = card.duplicate_of_code;
  }

  return code;
}

export function getCardTagFilterCode(tagName: string): string {
  return `${CARD_TAG_FILTER_TAG_PREFIX}${tagName}`;
}

export function getCardTagNameFromFilterCode(code: string): string | undefined {
  if (!code.startsWith(CARD_TAG_FILTER_TAG_PREFIX)) return undefined;
  return code.slice(CARD_TAG_FILTER_TAG_PREFIX.length);
}

export function isKnownCardTagName(
  tags: CardTagsState["tags"],
  name: string,
): boolean {
  return tags.includes(name);
}

export function parseCardTagNames(tagNames: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const name of tagNames) {
    const tagName = CardTagSchema.parse(name);
    const normalizedName = normalizeCardTagName(tagName);
    if (seen.has(normalizedName)) continue;

    seen.add(normalizedName);
    result.push(tagName);
  }

  return result;
}

export function mergeCardTagNames(
  ...groups: Array<Iterable<string> | undefined>
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    if (!group) continue;

    for (const tagName of group) {
      const normalizedName = normalizeCardTagName(tagName);
      if (!normalizedName || seen.has(normalizedName)) continue;

      seen.add(normalizedName);
      result.push(tagName);
    }
  }

  return result;
}

function getFirstLookupKey(
  lookup: Record<string, string | number> | undefined,
): string | undefined {
  if (!lookup) return undefined;

  for (const key of Object.keys(lookup)) {
    return key;
  }

  return undefined;
}
