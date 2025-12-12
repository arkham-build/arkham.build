import { displayAttribute } from "@/utils/card-utils";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import type { Card } from "../schemas/card.schema";
import type { Search } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";

function prepareCardFace(card: Card, search: Search) {
  const needle: string[] = [];

  if (search.includeName) {
    if (card.real_name) needle.push(displayAttribute(card, "name"));
    if (card.real_subname) needle.push(displayAttribute(card, "subname"));
  }

  if (search.includeGameText) {
    if (card.real_traits) needle.push(displayAttribute(card, "traits"));
    if (card.real_text) needle.push(displayAttribute(card, "text"));
    if (card.real_customization_text) {
      needle.push(displayAttribute(card, "customization_text"));
    }
  }

  if (search.includeFlavor) {
    if (card.real_flavor) needle.push(displayAttribute(card, "flavor"));
  }

  return needle;
}

function prepareCardBack(card: Card, search: Search) {
  const needle = [];

  if (search.includeName) {
    needle.push(displayAttribute(card, "back_name"));
  }

  if (search.includeGameText) {
    if (card.real_back_traits)
      needle.push(displayAttribute(card, "back_traits"));
    if (card.real_back_text) needle.push(displayAttribute(card, "back_text"));
  }

  if (search.includeFlavor && card.real_back_flavor) {
    needle.push(displayAttribute(card, "back_flavor"));
  }

  return needle;
}

export function applySearch(
  search: Search,
  cards: Card[],
  metadata: Metadata,
): Card[] {
  const needle = prepareNeedle(search.value);
  if (!needle) return cards;

  return cards.filter((card) => {
    const content = prepareCardFace(card, search);

    if (search.includeBacks && card.real_back_text) {
      content.push(...prepareCardBack(card, search));
    } else if (search.includeBacks && card.back_link_id) {
      const back = metadata.cards[card.back_link_id];
      if (back) {
        content.push(...prepareCardFace(back, search));
      }
    }

    return fuzzyMatch(content, needle);
  });
}
