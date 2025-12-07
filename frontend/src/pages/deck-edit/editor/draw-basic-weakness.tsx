import { ShuffleIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import type { Id } from "@/store/schemas/deck.schema";
import { displayAttribute } from "@/utils/card-utils";

type Props = {
  deckId: Id;
  quantity?: number;
  targetDeck: string;
};

export function DrawBasicWeakness(props: Props) {
  const { t } = useTranslation();

  const toast = useToast();

  const drawRandomBasicWeakness = useStore(
    (state) => state.drawRandomBasicWeakness,
  );

  return (
    <Button
      disabled={!props.quantity || props.targetDeck !== "slots"}
      iconOnly
      onClick={() => {
        const weakness = drawRandomBasicWeakness(props.deckId);
        toast.show({
          variant: "success",
          duration: 3000,
          children: (
            <Trans
              defaults="<strong>{{name}}</strong> is your random basic weakness."
              i18nKey="deck_edit.actions.draw_random_basic_weakness_success"
              t={t}
              values={{ name: displayAttribute(weakness, "name") }}
              components={{ strong: <strong /> }}
            />
          ),
        });
      }}
      size="sm"
      data-testid="draw-basic-weakness"
      tooltip={t("deck_edit.actions.draw_random_basic_weakness")}
      variant="bare"
    >
      <ShuffleIcon />
    </Button>
  );
}
