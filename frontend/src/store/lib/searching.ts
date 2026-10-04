import type { Card } from "@arkham-build/shared";
import {
  matchingAttribute,
  splitCommaSeparatedValue,
} from "@/utils/card-utils";
import { fuzzyMatch, prepareNeedle, type SearchTextCache } from "@/utils/fuzzy";
import i18n from "@/utils/i18n";
import type { Search } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";

function prepareCardFace(card: Card, search: Search) {
  const needle: string[] = [];

  if (search.includeName) {
    if (card.real_name) needle.push(...searchableAttribute(card, "name"));
    if (card.real_subname) needle.push(...searchableAttribute(card, "subname"));
    needle.push(...splitCommaSeparatedValue(card.abbreviation));
  }

  if (search.includeGameText) {
    if (card.real_traits) needle.push(...searchableAttribute(card, "traits"));
    if (card.real_text) needle.push(...searchableAttribute(card, "text"));
    if (card.real_customization_text) {
      needle.push(...searchableAttribute(card, "customization_text"));
    }
    if (card.victory != null) {
      needle.push(`${i18n.t("common.victory")} ${card.victory}.`);
    }
    if (card.vengeance != null) {
      needle.push(`${i18n.t("common.vengeance")} ${card.vengeance}.`);
    }
  }

  if (search.includeFlavor) {
    if (card.real_flavor) needle.push(...searchableAttribute(card, "flavor"));
  }

  return needle;
}

function prepareCardBack(card: Card, search: Search) {
  const needle = [];

  if (search.includeName) {
    needle.push(...searchableAttribute(card, "back_name"));
    if (
      card.back_subname ||
      (i18n.language !== "en" && card.real_back_subname)
    ) {
      needle.push(...searchableAttribute(card, "back_subname"));
    }
  }

  if (search.includeGameText) {
    if (card.real_back_traits) {
      needle.push(...searchableAttribute(card, "back_traits"));
    }
    if (card.real_back_text)
      needle.push(...searchableAttribute(card, "back_text"));
  }

  if (search.includeFlavor && card.real_back_flavor) {
    needle.push(...searchableAttribute(card, "back_flavor"));
  }

  return needle;
}

function searchableAttribute(
  card: Card,
  key: Parameters<typeof matchingAttribute>[1],
): string[] {
  const value = matchingAttribute(card, key, i18n.language);
  return Array.isArray(value) ? value : [value];
}

export function applySearch(
  search: Search,
  cards: Card[],
  metadata: Metadata,
  searchTextCache?: SearchTextCache,
): Card[] {
  if (metadata.cards[search.value]) {
    return cards.filter(
      (card) => card.id === search.value || card.back_link_id === search.value,
    );
  }

  const needle = prepareNeedle(search.value);
  if (!needle) return cards;

  return cards.filter((card) => {
    const content = prepareCardFace(card, search);

    if (search.includeBacks && !card.back_link_id) {
      content.push(...prepareCardBack(card, search));
    } else if (search.includeBacks && card.back_link_id) {
      const back = metadata.cards[card.back_link_id];
      if (back) {
        content.push(...prepareCardFace(back, search));
      }
    }

    return fuzzyMatch(content, needle, searchTextCache);
  });
}
