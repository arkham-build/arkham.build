import { type Card, SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { Trans, useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectMetadata } from "@/store/selectors/shared";
import { cardLimit, displayAttribute } from "@/utils/card-utils";
import { useToast } from "../ui/toast.hooks";

export function useAddBasicWeakness(
  deck: ResolvedDeck,
  replaceRandomBasicWeakness = true,
) {
  const { t } = useTranslation();
  const toast = useToast();
  const metadata = useStore(selectMetadata);
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  return function addBasicWeakness(weakness: Card) {
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

    toast.show({
      children: (
        <Trans
          components={{ strong: <strong /> }}
          i18nKey="deck_edit.actions.draft_random_basic_weakness_success"
          t={t}
          values={{ name: displayAttribute(weakness, "name") }}
        />
      ),
      duration: 3000,
      variant: "success",
    });
  };
}
