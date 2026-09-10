import type { Card } from "@arkham-build/shared";
import { HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TagItem } from "@/store/selectors/card-tags";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import { Tag } from "../ui/tag";
import { CardTagLabel } from "./card-tag-label";
import css from "./card-tag-list.module.css";

type Props = {
  card: Card;
  className?: string;
  favorite?: boolean;
  items: TagItem[];
  showLocal?: boolean;
  size?: "xs" | "sm";
};

export function CardTagList({
  card,
  className,
  favorite,
  items,
  showLocal = true,
  size = "xs",
}: Props) {
  const { t } = useTranslation();
  const accentColor = useAccentColor(card);

  if (!favorite && !items.length) return null;

  return (
    <ul className={cx(css["tag-row"], className)} style={accentColor}>
      {favorite && (
        <Tag as="li" className={css["tag"]} size={size}>
          <HeartIcon className={css["favorite-icon"]} />
          {t("card_tags.favorite")}
        </Tag>
      )}
      {items.map((item) => (
        <Tag
          as="li"
          className={cx(css["tag"], showLocal && !item.global && css["local"])}
          key={item.code}
          size={size}
        >
          <CardTagLabel>{item.tag}</CardTagLabel>
        </Tag>
      ))}
    </ul>
  );
}
