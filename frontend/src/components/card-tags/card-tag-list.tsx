import { cx } from "@/utils/cx";
import { Tag } from "../ui/tag";
import { CardTagLabel } from "./card-tag-label";
import css from "./card-tag-list.module.css";
import type { TagItem } from "./use-card-tags";

type Props = {
  className?: string;
  items: TagItem[];
};

export function CardTagList({ className, items }: Props) {
  if (!items.length) return null;

  return (
    <ul className={cx(css["tag-row"], className)}>
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
