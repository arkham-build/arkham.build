import type { Card } from "@arkham-build/shared";
import { ArrowRightToLineIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";

type Props = {
  card: Card;
  deck: ResolvedDeck;
};

export function MoveToSideDeck(props: Props) {
  const { card, deck } = props;
  const { t } = useTranslation();

  const swapDeck = useStore((state) => state.swapDeck);

  const onButtonClick = useCallback(() => {
    swapDeck(card, deck.id, "sideSlots");
  }, [card, deck.id, swapDeck]);

  return (
    <Button
      data-testid="editor-move-to-side"
      iconOnly
      onClick={onButtonClick}
      tooltip={t("deck_edit.actions.move_to_side_deck")}
      size="sm"
      variant="bare"
    >
      <ArrowRightToLineIcon />
    </Button>
  );
}
