import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import { cx } from "@/utils/cx";
import { formatDeckOptionString, formatTabooSet } from "@/utils/formatting";
import css from "./deck-details.module.css";
import { FactionIcon } from "./icons/faction-icon";

type Props = {
  className?: string;
  deck: ResolvedDeck;
  omitDeckSize?: boolean;
  omitXpRequired?: boolean;
  size?: "sm";
};

export function DeckDetails(props: Props) {
  const { className, deck, omitDeckSize, omitXpRequired, size } = props;
  const { t } = useTranslation();

  return (
    <ul className={cx(css["details"], size && css[size], className)}>
      {!omitDeckSize && (
        <DeckDetail
          data-testid="deck-details-deck-size"
          icon={<i className="icon-card-outline-bold" />}
          label={t("deck.stats.deck_size")}
        >
          {deck.stats.deckSize} ({deck.stats.deckSizeTotal} {t("common.total")})
        </DeckDetail>
      )}

      {!omitXpRequired && (
        <DeckDetail
          data-testid="deck-details-xp"
          icon={<i className="icon-xp-bold" />}
          label={t("deck.stats.xp_required")}
        >
          {deck.stats.xpRequired}
        </DeckDetail>
      )}

      <DeckDetail
        data-testid="deck-details-taboo"
        icon={<i className="icon-taboo" />}
        label={t("common.taboo")}
      >
        {deck.tabooSet ? (
          <span>{formatTabooSet(deck.tabooSet)}</span>
        ) : (
          t("common.taboo_none")
        )}
      </DeckDetail>

      {!!deck.selections &&
        Object.entries(deck.selections).map(([key, selection]) => (
          <DeckDetail
            data-testid={`deck-details-selection-${key}`}
            key={key}
            label={formatDeckOptionString(selection.name)}
          >
            {selection.type === "deckSize" && selection.value}
            {selection.type === "faction" &&
              (selection.value ? (
                <span className={css["detail-faction"]}>
                  <FactionIcon
                    className={`fg-${selection.value}`}
                    code={selection.value}
                  />
                  {t(`common.factions.${selection.value}`)}
                </span>
              ) : (
                t("common.none")
              ))}
            {selection.type === "option" &&
              formatDeckOptionString(selection.value?.name)}
          </DeckDetail>
        ))}
    </ul>
  );
}

export function DeckDetail<T extends React.ElementType>({
  as = "li",
  children,
  icon,
  label,
  ...rest
}: {
  as?: T;
  icon?: React.ReactNode;
  label: React.ReactNode;
  children: React.ReactNode;
} & React.ComponentProps<T>) {
  const Tag = as;

  return (
    <Tag className={css["detail"]} {...rest}>
      <div className={css["detail-label"]} data-testid="deck-details-label">
        {icon}
        {label}
      </div>
      <div className={css["detail-value"]} data-testid="deck-details-value">
        {children}
      </div>
    </Tag>
  );
}
