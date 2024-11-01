import type { Card } from "@/store/services/queries.types";
import { getCardColor, hasImage, thumbnailUrl } from "@/utils/card-utils";
/* eslint-disable react/display-name */
import { cx } from "@/utils/cx";
import { memo } from "react";
import css from "./card-thumbnail.module.css";

type Props = {
  card: Card;
  className?: string;
  suffix?: string;
};

// memoize this component with a custom equality check.
// not doing results in a lot of aborted requests in firefox, which in turn seem to lead to cache misses.
export const CardThumbnail = memo(
  (props: Props) => {
    const { card, className, suffix } = props;

    const colorCls = getCardColor(card);

    if (!hasImage(card)) return null;

    const imageCode = `${card.code}${suffix ?? ""}`;

    return (
      <div
        className={cx(
          css["thumbnail"],
          css[card.type_code],
          card.subtype_code && css[card.subtype_code],
          colorCls,
          className,
        )}
        key={card.code}
      >
        <img alt={`Thumbnail: ${imageCode}`} src={thumbnailUrl(imageCode)} />
      </div>
    );
  },
  (prev, next) => prev.card.code === next.card.code,
);
