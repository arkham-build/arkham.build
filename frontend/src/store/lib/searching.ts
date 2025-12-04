import uFuzzy from "@leeoniya/ufuzzy";
import { displayAttribute } from "@/utils/card-utils";
import { LOCALES } from "@/utils/constants";
import { normalizeDiacritics } from "@/utils/normalize-diacritics";
import type { Card } from "../schemas/card.schema";
import type { Search } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";

/**
 * When searching, the maximum distance between two parts of the search to be considered a match.
 * This makes search like `+1 [willpower]` work (for the most part).
 * 18 chars to accomodate "[...] at a skill test [...]".
 */
const MATCHING_MAX_TOKEN_DISTANCE = 18;

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

  return needle.join("|");
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

  return needle.join("|");
}

export function instantiateSearchFromLocale(
  locale: string,
  opts: Partial<uFuzzy.Options> = {},
): uFuzzy {
  const options: uFuzzy.Options = {
    intraMode: 0,
    ...opts,
  };

  const localeDefinition = LOCALES[locale];

  // https://github.com/leeoniya/uFuzzy/?tab=readme-ov-file#charsets-alphabets-diacritics
  if (localeDefinition?.unicode) {
    options.unicode = true;
    options.interSplit = "[^\\p{L}\\d']+";
    options.intraSplit = "\\p{Ll}\\p{Lu}";
    options.intraBound = "\\p{L}\\d|\\d\\p{L}|\\p{Ll}\\p{Lu}";
    options.intraChars = "[\\p{L}\\d']";
    options.intraContr = "'\\p{L}{1,2}\\b";
  } else {
    const alpha = localeDefinition?.additionalCharacters
      ? `a-z${localeDefinition.additionalCharacters}`
      : "a-z";
    options.alpha = alpha;
  }

  return new uFuzzy(options);
}

export function applySearch(
  search: Search,
  cards: Card[],
  metadata: Metadata,
  locale: string,
): Card[] {
  const uf = instantiateSearchFromLocale(locale, {
    interIns: MATCHING_MAX_TOKEN_DISTANCE,
  });

  const searchCards = cards.map((card) => {
    let content = prepareCardFace(card, search);

    if (search.includeBacks && card.real_back_text) {
      content += prepareCardBack(card, search);
    } else if (search.includeBacks && card.back_link_id) {
      const back = metadata.cards[card.back_link_id];
      if (back) content += prepareCardFace(back, search);
    }

    return normalizeDiacritics(content);
  });

  const results = uf.search(searchCards, prepareNeedle(search.value), 0);

  if (!results?.[0]) return cards;

  const matches = results[0].reduce<Record<string, boolean>>((acc, curr) => {
    acc[curr] = true;
    return acc;
  }, {});

  return cards.filter((_, i) => matches[i]);
}

function prepareNeedle(needle: string): string {
  return normalizeDiacritics(needle.replaceAll(/((?:\+|-)\d+)/g, `"$1"`));
}
