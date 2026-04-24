import { useStore } from "@/store";
import { selectCardWithRelations } from "@/store/selectors/card-view";
import { Annotation } from "../annotations/annotation";
import { Card } from "../card/card";
import { useResolvedDeck } from "../resolved-deck-context";
import css from "./card-tooltip.module.css";

type Props = {
  code: string;
};

export function CardTooltip(props: Props) {
  const ctx = useResolvedDeck();

  const resolvedCard = useStore((state) =>
    selectCardWithRelations(state, props.code, false, ctx.resolvedDeck),
  );

  if (!resolvedCard) return null;

  const annotation = ctx.resolvedDeck?.annotations[resolvedCard.card.code];

  return (
    <div className={css["tooltip"]} data-testid="card-tooltip">
      <Card resolvedCard={resolvedCard} size="tooltip" />
      {annotation && <Annotation content={annotation} size="sm" />}
    </div>
  );
}
