import { HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useResolvedDeck } from "../resolved-deck-context";
import { Tag } from "../ui/tag";
import css from "./card-tag-row.module.css";
import { useCardTagDisplay } from "./use-card-tags";

type Props = {
  cardCode: string;
  className?: string;
};

export function CardTagRow({ cardCode, className }: Props) {
  const { t } = useTranslation();
  const { resolvedDeck } = useResolvedDeck();
  const { isFavorite, selectedItems } = useCardTagDisplay(
    cardCode,
    resolvedDeck,
  );

  if (!isFavorite && !selectedItems.length) return null;

  return (
    <section className={cx(css["box"], className)}>
      <h2 className={css["header"]}>{t("card_tags.title")}</h2>
      <ul className={css["row"]}>
        {isFavorite && (
          <Tag as="li" size="sm">
            <HeartIcon className={css["favorite-icon"]} />
            {t("card_tags.favorite")}
          </Tag>
        )}
        {selectedItems.map((item) => (
          <Tag as="li" key={item.code} size="sm">
            {item.tag}
          </Tag>
        ))}
      </ul>
    </section>
  );
}
