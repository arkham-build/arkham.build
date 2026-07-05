import { HeartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { Button } from "../ui/button";
import css from "./card-favorite.module.css";
import { useCardFavorite } from "./use-card-tags";

type Props = {
  cardCode: string;
};

export function CardFavorite({ cardCode }: Props) {
  const { t } = useTranslation();
  const { isFavorite, onToggleFavorite } = useCardFavorite(cardCode);

  return (
    <Button
      aria-pressed={isFavorite}
      className={cx(css["favorite"], isFavorite && css["active"])}
      onClick={onToggleFavorite}
      full
    >
      <HeartIcon className={css["favorite-icon"]} />
      {t("card_tags.favorite")}
    </Button>
  );
}
