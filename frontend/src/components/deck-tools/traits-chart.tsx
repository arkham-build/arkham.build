import { Content, Root, Trigger } from "@radix-ui/react-collapsible";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { ChartableData } from "@/store/lib/deck-charts";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import { splitMultiValue } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { ListCard } from "../list-card/list-card";
import { Scroller } from "../ui/scroller";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
  deck: ResolvedDeck;
};

export function TraitsChart(props: Props) {
  const { data, deck } = props;

  const { t } = useTranslation();

  return (
    <div className={cx(css["chart-container"], css["traits"])}>
      <h4 className={css["chart-title"]}>{t("common.trait", { count: 2 })}</h4>
      <Scroller className={css["table-container"]} type="auto">
        <table className={css["table"]}>
          <thead>
            <tr>
              <th className={css["trait-chart-column-trait"]}>
                {t("common.trait", { count: 1 })}
              </th>
              <th className={css["trait-chart-column-count"]}>
                {t("deck.tools.count")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((trait) => (
              <TraitsChartRow key={trait.x} deck={deck} trait={trait} />
            ))}
          </tbody>
        </table>
      </Scroller>
    </div>
  );
}

function TraitsChartRow({
  deck,
  trait,
}: {
  deck: ResolvedDeck;
  trait: ChartableData<string>[0];
}) {
  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);

  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const cards = Object.values(deck.cards.slots)
    .reduce((acc, { card }) => {
      if (splitMultiValue(card.real_traits).includes(trait.x)) acc.push(card);
      return acc;
    }, [] as Card[])
    .sort(makeSortFunction(["name", "level", "position"], metadata, collator));

  return (
    <tr className={open ? css["open"] : css["closed"]}>
      <td className={css["trait-chart-column-trait"]}>
        <Root open={open} onOpenChange={setOpen}>
          <DefaultTooltip
            tooltip={<TraitsChartTooltip deck={deck} cards={cards} />}
            paused={open}
          >
            <Trigger asChild>
              <button className={css["trait-chart-title"]} type="button">
                {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
                <span className={css["trait"]}>
                  {i18n.exists(`common.traits.${trait.x}`)
                    ? t(`common.traits.${trait.x}`)
                    : trait.x}
                </span>
              </button>
            </Trigger>
          </DefaultTooltip>
          <Content className={css["trait-chart-item-details"]}>
            <ol className={css["trait-chart-item-details-list"]}>
              {cards.map((card) => (
                <ListCard
                  card={card}
                  key={card.code}
                  quantity={deck.slots[card.code]}
                  size="sm"
                  omitBorders
                />
              ))}
            </ol>
          </Content>
        </Root>
      </td>
      <td className={css["trait-chart-column-count"]}>{trait.y}</td>
    </tr>
  );
}

function TraitsChartTooltip({
  deck,
  cards,
}: {
  deck: ResolvedDeck;
  cards: Card[];
}) {
  return (
    <ol className={css["trait-tooltip"]}>
      {cards.map((card) => (
        <ListCard
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
