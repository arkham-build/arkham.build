import type { Card } from "@arkham-build/shared";
import { HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import { useResolvedDeck } from "../resolved-deck-context";
import { Tag } from "../ui/tag";
import { CardTagLabel } from "./card-tag-label";
import css from "./card-tag-row.module.css";
import { useCardTagDisplay } from "./use-card-tags";

type Props = {
  card: Card;
  className?: string;
};

export function CardTagRow({ card, className }: Props) {
  const { t } = useTranslation();
  const { resolvedDeck } = useResolvedDeck();
  const accentColor = useAccentColor(card);
  const { isFavorite, selectedItems } = useCardTagDisplay(
    card.code,
    resolvedDeck,
  );

  if (!isFavorite && !selectedItems.length) return null;

  return (
    <section className={cx(css["box"], className)}>
      <h2 className={css["header"]}>{t("card_tags.title")}</h2>
      <ul className={css["row"]} style={accentColor}>
        {isFavorite && (
          <Tag as="li" size="sm">
            <HeartIcon className={css["favorite-icon"]} />
            {t("card_tags.favorite")}
          </Tag>
        )}
        {selectedItems.map((item) => (
          <Tag as="li" key={item.code} size="sm">
            <CardTagLabel>{item.tag}</CardTagLabel>
          </Tag>
        ))}
      </ul>
    </section>
  );
}
