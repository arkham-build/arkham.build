import { CARD_TAG_FAVORITE_ID, type CardTagsState } from "@arkham-build/shared";
import type { Metadata } from "../slices/metadata.types";
import type { LookupTables } from "./lookup-tables.types";

type FrontCardLookup = LookupTables["relations"]["fronts"];

export function getEmptyCardTagsState(): CardTagsState {
  return {
    tags: {},
    cardTags: {},
  };
}

export function canonicalizeCardTagsState(
  state: CardTagsState,
  metadata: Metadata,
  fronts: FrontCardLookup,
): CardTagsState {
  const cardTags: CardTagsState["cardTags"] = {};

  for (const [cardCode, tagIds] of Object.entries(state.cardTags)) {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagIds = cardTags[canonicalCode] ?? [];
    const seen = new Set(assignedTagIds);

    for (const tagId of tagIds) {
      if (seen.has(tagId)) continue;

      seen.add(tagId);
      assignedTagIds.push(tagId);
    }

    if (assignedTagIds.length) {
      cardTags[canonicalCode] = assignedTagIds;
    }
  }

  return {
    tags: state.tags,
    cardTags,
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

export function isKnownCardTagId(
  tags: CardTagsState["tags"],
  tagId: string,
): boolean {
  return tagId === CARD_TAG_FAVORITE_ID || tags[tagId] != null;
}

export function normalizeCardTagName(name: string): string {
  return name.trim().toLowerCase();
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
