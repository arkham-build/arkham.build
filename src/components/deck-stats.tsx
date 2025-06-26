import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import css from "./deck-stats.module.css";
import { DefaultTooltip } from "./ui/tooltip";

type Props = {
  deck: ResolvedDeck;
};

export function DeckStats(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();

  const xpRequired = deck.stats.xpRequired;
  const xpEarned = (deck.xp ?? 0) + (deck.xp_adjustment ?? 0);

  return (
    <div className={css["stats"]}>
      <DefaultTooltip tooltip={t("deck.stats.xp_required_help")}>
        <strong data-testid="deck-summary-xp">
          <i className="icon-xp-bold" />
          {xpRequired} {t("common.xp", { count: xpRequired })}
        </strong>
      </DefaultTooltip>
      {!!deck.xp && (
        <DefaultTooltip tooltip={t("deck.stats.xp_available_help")}>
          <strong data-testid="deck-xp-earned">
            <i className="icon-upgrade" />
            {xpEarned} {t("common.xp", { count: xpEarned })}
          </strong>
        </DefaultTooltip>
      )}
      <DefaultTooltip tooltip={t("deck.stats.deck_size")}>
        <strong data-testid="deck-summary-size">
          <i className="icon-card-outline-bold" />× {deck.stats.deckSize} (
          {deck.stats.deckSizeTotal})
        </strong>
      </DefaultTooltip>
    </div>
  );
}
