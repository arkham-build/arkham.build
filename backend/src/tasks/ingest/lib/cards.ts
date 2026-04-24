import type { JsonDataCard } from "@arkham-build/shared";
import type { CardResolution } from "../../../db/schema.types.ts";
import type {
  TranslationTable,
  WithItemTranslations,
} from "./json-data.types.ts";
import type { TabooSetWithTranslations } from "./taboo-sets.ts";

type In = WithItemTranslations<JsonDataCard>;

type Out = In & {
  id: string;
};

type Output = {
  cards: Out[];
  cardResolutions: CardResolution[];
};

type CardPackWithTranslations = {
  translations: TranslationTable<JsonDataCard>;
};

export function mergeTranslations(
  cardPacks: CardPackWithTranslations[],
): TranslationTable<JsonDataCard> {
  return cardPacks.reduce(
    (acc, pack) => {
      for (const [locale, translations] of Object.entries(pack.translations)) {
        acc[locale] = { ...acc[locale], ...translations };
      }

      return acc;
    },
    {} as TranslationTable<JsonDataCard>,
  );
}

export function resolveCards(
  input: In[],
  tabooSets: TabooSetWithTranslations[],
): Output {
  const cardMapping = new Map(input.map((card) => [card.code, card]));

  const cardResolutions: CardResolution[] = [];
  const cards: Out[] = [];

  for (const card of cardMapping.values()) {
    const id = card.code;

    // expand cards that should resolve to another printing.
    if (card.duplicate_of) {
      cardResolutions.push({ id, resolves_to: card.duplicate_of });
      let source = cardMapping.get(card.duplicate_of);

      if (source?.duplicate_of || source?.reprint_of) {
        source = {
          ...cardMapping.get(
            (source?.duplicate_of || source?.reprint_of) as string,
          ),
          ...source,
        };
      }

      const expanded = { ...source, ...card, id } as Out;

      cards.push(expanded);
      cardMapping.set(id, expanded);
      // expand reprint cards. these are not duplicates due to chapter switch.
    } else if (card.reprint_of) {
      const source = cardMapping.get(card.reprint_of);
      const expanded = { ...source, ...card, id } as Out;
      cards.push(expanded);
      cardMapping.set(id, expanded);
    } else {
      cards.push({ ...card, id });
    }
  }

  // expand taboo entries to cards.
  for (const tabooSet of tabooSets) {
    for (const tabooEntry of tabooSet.cards) {
      const tabooCardId = `${tabooEntry.code}-${tabooSet.id}`;

      if (!cardMapping.get(tabooCardId)) {
        const tabooCard = applyTabooEntry(
          cardMapping.get(tabooEntry.code as string) as In,
          tabooSet,
          tabooEntry,
        );
        cardMapping.set(tabooCardId, tabooCard);
        cards.push(tabooCard);
      }

      // add taboo card entries for all duplicates of a card
      for (const duplicate of cardResolutions.filter(
        (c) => c.resolves_to === tabooEntry.code,
      )) {
        const duplicateTabooId = `${duplicate.id}-${tabooSet.id}`;
        if (!cardMapping.get(duplicateTabooId)) {
          const duplicateTabooCard = applyTabooEntry(
            cardMapping.get(duplicate.id) as In,
            tabooSet,
            tabooEntry,
          );
          cards.push(duplicateTabooCard);
          cardMapping.set(duplicateTabooId, duplicateTabooCard);
        }
      }
    }
  }

  return { cards, cardResolutions };
}

function applyTabooEntry(
  card: In,
  tabooSet: TabooSetWithTranslations,
  tabooEntry: TabooSetWithTranslations["cards"][0],
) {
  const {
    code,
    text: tabooTextChange,
    replacement_text,
    replacement_back_text,
    translations,
    xp: taboo_xp,
    ...properties
  } = tabooEntry;

  const tabooCard = {
    ...card,
    ...properties,
    back_text: replacement_back_text || card.back_text,
    deck_limit: tabooEntry.exceptional
      ? 1
      : tabooEntry.text?.includes("Forbidden")
        ? 0
        : card.deck_limit,
    id: `${card.code}-${tabooSet.id}`,
    taboo_set_id: tabooSet.id,
    taboo_text_change: tabooTextChange,
    taboo_xp,
    text: replacement_text || card.text,
    translations: card.translations.map((translation) => {
      const match = translations.find((t) => t.locale === translation.locale);

      return match
        ? {
            ...translation,
            customization_change:
              match.customization_change ||
              translation.customization_change ||
              card.customization_change,
            customization_text:
              match.customization_text ||
              translation.customization_text ||
              card.customization_text,
            taboo_text_change: match.text || tabooTextChange,
            back_text:
              match.replacement_back_text ||
              replacement_back_text ||
              translation.back_text ||
              card.back_text,
            text:
              match.replacement_text ||
              replacement_text ||
              translation.text ||
              card.text,
          }
        : {
            ...translation,
            customization_change:
              translation.customization_change || card.customization_change,
            customization_text:
              translation.customization_text || card.customization_text,
            taboo_text_change: tabooTextChange,
            text: replacement_text || translation.text || card.text,
            back_text:
              replacement_back_text || translation.back_text || card.back_text,
          };
    }),
  } as Out;

  return tabooCard;
}
