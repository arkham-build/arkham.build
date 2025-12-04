import { useCallback, useId } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import { cx } from "@/utils/cx";
import { Checkbox } from "../ui/checkbox";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card-recommender.module.css";

type CoreCardCheckboxProps = {
  card: Card;
  deck: ResolvedDeck;
};

export function CoreCardCheckbox(props: CoreCardCheckboxProps) {
  const { card, deck } = props;
  const { t } = useTranslation();

  const id = useId();

  const checked = useStore((state) =>
    state.recommender.coreCards[props.deck.id]?.includes(props.card.code),
  );

  const addCoreCard = useStore((state) => state.addCoreCard);
  const removeCoreCard = useStore((state) => state.removeCoreCard);

  const onCheck = useCallback(
    (val: boolean | string) => {
      if (val) {
        addCoreCard(deck.id, card.code);
      } else {
        removeCoreCard(deck.id, card.code);
      }
    },
    [addCoreCard, removeCoreCard, card.code, deck.id],
  );

  return (
    <DefaultTooltip tooltip={t("deck_edit.recommendations.core_help")}>
      <Checkbox
        label={t("deck_edit.recommendations.core")}
        checked={checked}
        onCheckedChange={onCheck}
        className={cx(css["core-card-checkbox"])}
        id={id}
      />
    </DefaultTooltip>
  );
}
