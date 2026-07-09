import type { Card } from "@arkham-build/shared";
import { HeartIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import { Button } from "../ui/button";
import css from "./card-favorite.module.css";
import { useCardFavorite } from "./use-card-tags";

type Props = {
  card: Card;
};

export function CardFavorite({ card }: Props) {
  const { t } = useTranslation();
  const { isFavorite, onToggleFavorite } = useCardFavorite(card.code);
  const accentColor = useAccentColor(card);

  return (
    <Button
      aria-pressed={isFavorite}
      className={cx(css["favorite"], isFavorite && css["active"])}
      onClick={onToggleFavorite}
      full
      style={accentColor}
    >
      <HeartIcon className={css["favorite-icon"]} />
      {t("card_tags.favorite")}
    </Button>
  );
}

export function CardFavoriteAction({ card }: Props) {
  const { t } = useTranslation();
  const { isFavorite, onToggleFavorite } = useCardFavorite(card.code);

  const onClick = useCallback(
    (evt: React.MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      onToggleFavorite();
    },
    [onToggleFavorite],
  );

  return (
    <Button
      aria-label={t("card_tags.favorite")}
      aria-pressed={isFavorite}
      className={cx(css["favorite-action"], isFavorite && css["active"])}
      onClick={onClick}
      iconOnly
      rounded="full"
    >
      <HeartIcon className={css["favorite-action-icon"]} />
    </Button>
  );
}
