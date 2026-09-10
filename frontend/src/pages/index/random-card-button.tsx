import { DicesIcon } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { selectListCards } from "@/store/selectors/lists";
import { randomInt } from "@/utils/random-int";

export function RandomCardButton() {
  const enabled = useStore((state) => state.settings.flags?.[FLAG] === true);

  const onClick = useCallback(() => {
    const state = useStore.getState();
    const data = selectListCards(state, undefined, undefined);
    if (!data?.cards.length) return;

    const card = data.cards[randomInt(0, data.cards.length - 1)];
    state.openCardModal(card.code);
  }, []);

  if (!enabled) return null;

  return (
    <Button onClick={onClick} size="sm">
      <DicesIcon />
      Roll card
    </Button>
  );
}

const FLAG = "show_random_card_button";
