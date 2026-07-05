import type { Card } from "@arkham-build/shared";
import { HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import { Tag } from "../ui/tag";
import { CardTagLabel } from "./card-tag-label";
import css from "./card-tag-list.module.css";
import type { TagItem } from "./use-card-tags";

type Props = {
  card: Card;
  className?: string;
  favorite?: boolean;
  items: TagItem[];
};

export function CardTagList({ card, className, favorite, items }: Props) {
  const { t } = useTranslation();
  const accentColor = useAccentColor(card);

  if (!favorite && !items.length) return null;

  return (
    <ul className={cx(css["tag-row"], className)} style={accentColor}>
      {favorite && (
        <Tag as="li" className={cx(css["tag"], css["favorite"])} size="xs">
          <HeartIcon className={css["favorite-icon"]} />
          {t("card_tags.favorite")}
        </Tag>
      )}
      {items.map((item) => (
        <Tag
          as="li"
          className={cx(css["tag"], !item.global && css["local"])}
          key={item.code}
          size="xs"
        >
          <CardTagLabel>{item.tag}</CardTagLabel>
        </Tag>
      ))}
    </ul>
  );
}
