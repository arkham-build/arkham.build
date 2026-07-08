import type { Card } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useResolvedDeck } from "../resolved-deck-context";
import { CardTagList } from "./card-tag-list";
import css from "./card-tag-row.module.css";
import { useCardTagDisplay } from "./use-card-tags";

type Props = {
  card: Card;
  className?: string;
};

export function CardTagRow({ card, className }: Props) {
  const { t } = useTranslation();
  const { resolvedDeck } = useResolvedDeck();
  const { isFavorite, selectedItems } = useCardTagDisplay(
    card.code,
    resolvedDeck,
  );

  if (!isFavorite && !selectedItems.length) return null;

  return (
    <section className={cx(css["box"], className)}>
      <h2 className={css["header"]}>{t("card_tags.title")}</h2>
      <CardTagList
        card={card}
        className={css["row"]}
        favorite={isFavorite}
        items={selectedItems}
        size="sm"
      />
    </section>
  );
}
