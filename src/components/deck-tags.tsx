import type { TFunction } from "i18next";
import { LockKeyholeIcon, ShareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { capitalize, formatProviderName } from "@/utils/formatting";
import css from "./deck-tags.module.css";
import { Tag } from "./ui/tag";

type Props = {
  tags: string[];
};

export const tagRenderer = (tag: string, t: TFunction) => {
  let icon = null;

  if (tag === "arkhamdb") {
    icon = <i className="icon-elder_sign" />;
  } else if (tag === "private") {
    icon = <LockKeyholeIcon />;
  } else if (tag === "shared") {
    icon = <ShareIcon />;
  }

  const str = tag.trim();

  return (
    <>
      {icon}
      <span>
        {str === "arkhamdb"
          ? formatProviderName(str)
          : str === "private"
            ? t("deck.tags.private")
            : str === "shared"
              ? t("deck.tags.shared")
              : capitalize(str)}
      </span>
    </>
  );
};

export function DeckTags(props: Props) {
  const { tags } = props;

  const { t } = useTranslation();

  if (!tags.length) return null;

  return (
    <ul className={css["tags"]} data-testid="deck-tags">
      {tags.map((s, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: order is stable.
        <Tag as="li" key={i} size="xs">
          {tagRenderer(s, t)}
        </Tag>
      ))}
    </ul>
  );
}
