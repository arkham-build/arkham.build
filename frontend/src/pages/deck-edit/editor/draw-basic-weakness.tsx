import type { Id } from "@arkham-build/shared";
import { ShuffleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWeaknessDraw } from "@/components/deck-tools/weakness-draw-context";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";

type Props = {
  deckId: Id;
  quantity?: number;
  targetDeck: string;
};

export function DrawBasicWeakness(props: Props) {
  const { t } = useTranslation();
  const { drawWeakness } = useWeaknessDraw();
  const drawRandomBasicWeakness = useStore(
    (state) => state.drawRandomBasicWeakness,
  );

  return (
    <Button
      disabled={!props.quantity || props.targetDeck !== "slots"}
      iconOnly
      onClick={() => drawWeakness(() => drawRandomBasicWeakness(props.deckId))}
      size="sm"
      data-testid="draw-basic-weakness"
      tooltip={t("deck_edit.actions.draw_random_basic_weakness")}
      variant="bare"
    >
      <ShuffleIcon />
    </Button>
  );
}
