import type { TFunction } from "i18next";
import { PinIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import type { Modifier } from "@/store/lib/deck-upgrades";
import type { ResolvedDeck } from "@/store/lib/types";
import type { History, HistoryEntry } from "@/store/selectors/decks";
import { cx } from "@/utils/cx";
import { formatUpgradeXP } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import type { DeckOrigin } from "../types";
import { CustomizableDiff } from "./customizable-diff";
import css from "./deck-history.module.css";
import { SlotDiff } from "./slot-diff";

type Props = {
  deck: ResolvedDeck;
  history: History;
  origin: DeckOrigin;
};

export function DeckHistory(props: Props) {
  const { deck, history, origin } = props;

  const { t } = useTranslation();

  const prefix = origin === "share" ? "~/share" : "~/deck/view";

  return (
    <ol className={css["entries"]} data-testid="history">
      {history.map((stats, idx) => {
        const isLast = idx === history.length - 1;
        const isCurrent = stats.id === deck.id;

        const title =
          isCurrent && !isLast
            ? t("deck_view.history.current_upgrade")
            : isLast
              ? t("deck_view.history.initial_deck")
              : t("deck_view.history.upgrade", {
                  index: history.length - idx - 1,
                });

        const titleNode = isCurrent ? (
          <>
            <PinIcon />
            {title}
          </>
        ) : (
          <Link to={`${prefix}/${stats.id}`}>
            {title}
            <SquareArrowOutUpRightIcon />
          </Link>
        );

        return (
          <DeckHistoryEntry
            className={isCurrent ? css["current"] : undefined}
            data={stats}
            deck={deck}
            // biome-ignore lint/suspicious/noArrayIndexKey: no natural key available.
            key={idx}
            showDiscounts
            showUpgradeXp={!isLast}
            title={titleNode}
          />
        );
      })}
    </ol>
  );
}

function formatModifier(modifier: Modifier, t: TFunction) {
  return t(`deck_view.discounts.${modifier}`);
}

export function DeckHistoryEntry(props: {
  children?: React.ReactNode;
  className?: string;
  data: HistoryEntry;
  deck: ResolvedDeck;
  showUpgradeXp?: boolean;
  showDiscounts?: boolean;
  size?: "sm";
  title: React.ReactNode;
}) {
  const { t } = useTranslation();

  const {
    children,
    className,
    data,
    deck,
    size,
    showDiscounts,
    showUpgradeXp,
    title,
  } = props;

  const hasChanges =
    !isEmpty(data.differences.slots) ||
    !isEmpty(data.differences.extraSlots) ||
    !isEmpty(data.differences.customizations) ||
    !isEmpty(data.differences.exileSlots);

  return (
    <li className={cx(css["entry"], size && css[size], className)}>
      <h3 className={css["entry-title"]}>{title}</h3>
      {showUpgradeXp &&
        data.xp != null &&
        data.xpAdjustment != null &&
        data.xpSpent != null && (
          <p className={css["entry-stats"]}>
            {formatUpgradeXP(data.xp, data.xpAdjustment, data.xpSpent)}
          </p>
        )}
      {children}
      <div className={css["entry-container"]}>
        {hasChanges && (
          <>
            <div className={css["entry-row"]}>
              <SlotDiff
                deck={deck}
                title={t("deck_view.history.slot_changes", {
                  slot: t("common.decks.slots"),
                })}
                differences={data.differences.slots}
                omitHeadings
                size={size}
              />
              <SlotDiff
                deck={deck}
                title={t("deck_view.history.slot_changes", {
                  slot: t("common.decks.extraSlots"),
                })}
                differences={data.differences.extraSlots}
                omitHeadings
                size={size}
              />
            </div>
            <div className={css["entry-row"]}>
              <SlotDiff
                deck={deck}
                title={t("common.exiled_cards")}
                differences={data.differences.exileSlots}
                omitHeadings
                size={size}
              />
              <CustomizableDiff
                deck={deck}
                title={t("common.customizations")}
                differences={data.differences.customizations}
                size={size}
              />
            </div>
          </>
        )}
        {!hasChanges && t("deck_view.history.no_changes")}
      </div>
      {showDiscounts && !isEmpty(data.modifierStats) && (
        <div className={css["discount-container"]}>
          <h4>{t("deck_view.history.discounts")}</h4>
          <dl className={css["discounts"]}>
            {Object.entries(data.modifierStats).map(([modifier, value]) => (
              <Fragment key={modifier}>
                <dt>{formatModifier(modifier as Modifier, t)}</dt>
                <dd>
                  {value.used} / {value.available}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      )}
    </li>
  );
}
