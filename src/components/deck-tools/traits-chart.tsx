import { useStore } from "@/store";
import type { ChartableData } from "@/store/lib/deck-charts";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import { cx } from "@/utils/cx";
import { useTranslation } from "react-i18next";
import { ListCardInner } from "../list-card/list-card-inner";
import { Scroller } from "../ui/scroller";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
  deck: ResolvedDeck;
};

export function TraitsChart(props: Props) {
  const { data, deck } = props;

  const { i18n, t } = useTranslation();

  return (
    <div className={cx(css["chart-container"], css["traits"])}>
      <h4 className={css["chart-title"]}>{t("common.trait", { count: 2 })}</h4>
      <Scroller className={css["table-container"]} type="auto">
        <table className={css["table"]}>
          <thead>
            <tr>
              <th>{t("common.trait", { count: 1 })}</th>
              <th>{t("deck.tools.count")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((trait) => (
              <Tooltip delay={200} key={trait.x}>
                <TooltipTrigger asChild>
                  <tr>
                    <td>
                      <span className={css["trait"]}>
                        {i18n.exists(`common.traits.${trait.x}`)
                          ? t(`common.traits.${trait.x}`)
                          : trait.x}
                      </span>
                    </td>
                    <td>{trait.y}</td>
                  </tr>
                </TooltipTrigger>
                <TooltipContent>
                  <TraitsChartTooltip deck={deck} trait={trait} />
                </TooltipContent>
              </Tooltip>
            ))}
          </tbody>
        </table>
      </Scroller>
    </div>
  );
}

function TraitsChartTooltip({
  deck,
  trait,
}: {
  deck: ResolvedDeck;
  trait: ChartableData<string>[0];
}) {
  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);

  const matches = Object.values(deck.cards.slots)
    .reduce((acc, { card }) => {
      if (card.real_traits?.includes(trait.x)) acc.push(card);
      return acc;
    }, [] as Card[])
    .sort(makeSortFunction(["name", "level", "position"], metadata, collator));

  return (
    <ol className={css["trait-tooltip"]}>
      {matches.map((card) => (
        <ListCardInner
          card={card}
          cardLevelDisplay="icon-only"
          key={card.code}
          omitThumbnail
          quantity={deck.slots[card.code]}
          size="xs"
        />
      ))}
    </ol>
  );
}
