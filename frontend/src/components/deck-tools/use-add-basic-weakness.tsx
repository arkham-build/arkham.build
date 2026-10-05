import { type Card, SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectMetadata } from "@/store/selectors/shared";
import { cardLimit } from "@/utils/card-utils";
import { useWeaknessDraw } from "./weakness-draw-context";

export function useAddBasicWeakness(
  deck: ResolvedDeck,
  replaceRandomBasicWeakness = true,
) {
  const { drawWeakness } = useWeaknessDraw();
  const metadata = useStore(selectMetadata);
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  return function addBasicWeakness(weakness: Card) {
    drawWeakness(() => {
      updateCardQuantity(deck.id, weakness.code, 1, cardLimit(weakness));

      if (replaceRandomBasicWeakness) {
        const placeholder =
          metadata.cards[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS];
        updateCardQuantity(
          deck.id,
          SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
          -1,
          cardLimit(placeholder),
        );
      }

      return weakness;
    });
  };
}
