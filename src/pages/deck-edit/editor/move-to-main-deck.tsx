import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/services/queries.types";
import { ArrowLeftToLineIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  card: Card;
  deck: ResolvedDeck;
};

export function MoveToMainDeck(props: Props) {
  const { card, deck } = props;
  const swapDeck = useStore((state) => state.swapDeck);
  const { t } = useTranslation();

  const onButtonClick = useCallback(() => {
    swapDeck(card, deck.id, "slots");
  }, [card, deck.id, swapDeck]);

  return (
    <Button
      data-testid="editor-move-to-main"
      iconOnly
      onClick={onButtonClick}
      tooltip={t("deck_edit.actions.move_to_main_deck")}
      size="sm"
    >
      <ArrowLeftToLineIcon />
    </Button>
  );
}
