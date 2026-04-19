import type { JsonDataCard } from "@arkham-build/shared";
import type { CardResolution } from "../../../db/schema.types.ts";
import type { WithItemTranslations } from "./json-data.types.ts";
import type { TabooSetWithTranslations } from "./taboo-sets.ts";

type In = WithItemTranslations<JsonDataCard>;

type Out = In & {
  id: string;
};

type Output = {
  cards: Out[];
  cardResolutions: CardResolution[];
};

export function resolveCards(
  input: In[],
  tabooSets: TabooSetWithTranslations[],
): Output {
  const cardMapping = new Map(input.map((card) => [card.code, card]));

  const cardResolutions = [];
  const cards = [];

  for (const card of cardMapping.values()) {
    const id = card.code;

    if (card.duplicate_of) {
      cardResolutions.push({ id, resolves_to: card.duplicate_of });
      const source = cardMapping.get(card.duplicate_of);
      const expanded = { ...source, ...card, id };
      cards.push(expanded);
      cardMapping.set(id, expanded);
    } else if (card.reprint_of) {
      const source = cardMapping.get(card.reprint_of);
      const expanded = { ...source, ...card, id };
      cards.push(expanded);
      cardMapping.set(id, expanded);
    } else {
      cards.push({ ...card, id });
    }
  }

  for (const tabooSet of tabooSets) {
    for (const tabooCard of tabooSet.cards) {
      const {
        code,
        text: tabooTextChange,
        replacement_text,
        replacement_back_text,
        translations,
        xp: taboo_xp,
        ...properties
      } = tabooCard;

      const card = cardMapping.get(code as string) as In;

      const mappedTranslations = card.translations.map((translation) => {
        const match = translations.find((t) => t.locale === translation.locale);
        if (!match) return translation;
        return {
          ...translation,
          taboo_text_change: match.text || translation.text,
          back_text: match.replacement_back_text || translation.back_text,
          text: match.replacement_text || translation.text,
        };
      });

      cards.push({
        ...card,
        ...properties,
        back_text: replacement_back_text || card.back_text,
        id: `${code}-${tabooSet.id}`,
        taboo_set_id: tabooSet.id,
        taboo_text_change: tabooTextChange,
        taboo_xp,
        text: replacement_text || card.text,
        translations: mappedTranslations,
      } as Out);
    }
  }

  return { cards, cardResolutions };
}
