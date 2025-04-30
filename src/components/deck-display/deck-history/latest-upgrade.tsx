import { CustomizableDiff } from "@/components/deck-display/deck-history/customizable-diff";
import { SlotDiff } from "@/components/deck-display/deck-history/slot-diff";
import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Scroller } from "@/components/ui/scroller";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectLatestUpgrade } from "@/store/selectors/decks";
import type { Card } from "@/store/services/queries.types";
import { mapTabToSlot } from "@/store/slices/deck-edits.types";
import { cardLimit, isStaticInvestigator } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { useAccentColor } from "@/utils/use-accent-color";
import {
  ArrowLeftToLineIcon,
  FlameIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import css from "./latest-upgrade.module.css";

type Props = {
  deck: ResolvedDeck;
  currentTab?: string;
  overflowScroll?: boolean;
  readonly?: boolean;
};

export function LatestUpgrade(props: Props) {
  const { currentTab, overflowScroll, readonly, deck } = props;
  const { t } = useTranslation();

  const accentColor = useAccentColor(deck.investigatorBack.card.faction_code);

  const latestUpgrade = useStore((state) => selectLatestUpgrade(state, deck));

  const updateXpAdjustment = useStore((state) => state.updateXpAdjustment);
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  const onIcrement = useCallback(
    (evt: React.MouseEvent<HTMLButtonElement>) => {
      evt.stopPropagation();
      updateXpAdjustment(deck.id, (latestUpgrade?.xpAdjustment ?? 0) + 1);
    },
    [deck.id, latestUpgrade?.xpAdjustment, updateXpAdjustment],
  );

  const onDecrement = useCallback(
    (evt: React.MouseEvent<HTMLButtonElement>) => {
      evt.stopPropagation();
      updateXpAdjustment(deck.id, (latestUpgrade?.xpAdjustment ?? 0) - 1);
    },
    [deck.id, latestUpgrade?.xpAdjustment, updateXpAdjustment],
  );

  const onAddExile = useCallback(
    (card: Card, quantity: number) => {
      if (!currentTab) return;
      updateCardQuantity(
        deck.id,
        card.code,
        quantity,
        cardLimit(card),
        mapTabToSlot(currentTab),
        "increment",
      );
    },
    [currentTab, deck.id, updateCardQuantity],
  );

  const canAddExile = useCallback(
    (card: Card) => {
      if (currentTab && currentTab !== "config") {
        const slot = deck[mapTabToSlot(currentTab)];
        if (slot) {
          const result = (slot[card.code] ?? 0) < cardLimit(card);
          return result;
        }
      }
      return false;
    },
    [currentTab, deck],
  );

  if (!latestUpgrade) return null;

  const { differences, xpSpent, xpAdjustment, xp } = latestUpgrade;

  const hasChanges =
    differences.slots.length ||
    differences.extraSlots.length ||
    differences.exileSlots.length ||
    differences.customizations.length;

  const staticInvestigator = isStaticInvestigator(deck.investigatorBack.card);

  const contentNode = (
    <div className={css["content-row"]}>
      {hasChanges ? (
        <>
          <SlotDiff
            title={t("common.decks.slots")}
            differences={differences.slots}
            size="sm"
          />
          <SlotDiff
            title={t("common.decks.extraSlots")}
            differences={differences.extraSlots}
            size="sm"
          />
          <SlotDiff
            title={t("common.exiled_cards")}
            differences={differences.exileSlots}
            omitHeadings
            size="sm"
          />
          <CustomizableDiff
            title={t("common.customizations")}
            differences={differences.customizations}
            size="sm"
          />
        </>
      ) : (
        t("deck.latest_upgrade.no_changes")
      )}
    </div>
  );

  return (
    <div
      className={cx(
        css["container"],
        overflowScroll && css["scroll"],
        readonly && css["readonly"],
      )}
      style={accentColor}
    >
      <Progress max={xp + xpAdjustment} value={xpSpent} validateInRange />
      <Collapsible
        className={css["collapsible"]}
        data-testid="latest-upgrade"
        omitBorder
        omitPadding
        triggerReversed
        title={
          <div className={css["title"]}>
            <div className={css["row"]} data-testid="latest-upgrade-summary">
              <i className="icon-xp-bold" />
              <strong>
                {t("deck.latest_upgrade.summary", {
                  xpSpent,
                  xp: xp + xpAdjustment,
                })}
              </strong>
              {!readonly && (
                <>
                  <Button
                    disabled={xp + xpAdjustment <= 0}
                    size="none"
                    data-testid="latest-upgrade-xp-decrement"
                    variant="bare"
                    onClick={onDecrement}
                  >
                    <MinusCircleIcon />
                  </Button>
                  <Button
                    data-testid="latest-upgrade-xp-increment"
                    size="none"
                    variant="bare"
                    onClick={onIcrement}
                  >
                    <PlusCircleIcon />
                  </Button>
                </>
              )}
              {xpAdjustment
                ? ` (${xpAdjustment >= 0 ? "+" : ""}${xpAdjustment})`
                : ""}
            </div>
            {!readonly && !isEmpty(Object.keys(deck.exileSlots)) && (
              <Popover placement="right-start">
                <PopoverTrigger asChild>
                  <Button
                    iconOnly
                    data-testid="latest-upgrade-exile"
                    onClick={(evt: React.MouseEvent<HTMLButtonElement>) => {
                      evt.stopPropagation();
                    }}
                    variant="bare"
                  >
                    <FlameIcon /> {t("common.exile")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent onClick={(evt) => evt.stopPropagation()}>
                  <article className={css["exile"]}>
                    <header>
                      <h4>{t("common.exiled_cards")}</h4>
                    </header>
                    <ol>
                      {Object.entries(deck.exileSlots).map(
                        ([code, quantity]) => (
                          <ListCard
                            key={code}
                            card={deck.cards.exileSlots[code].card}
                            quantity={quantity}
                            renderCardExtra={
                              !readonly
                                ? (card) => (
                                    <Button
                                      iconOnly
                                      disabled={
                                        staticInvestigator || !canAddExile(card)
                                      }
                                      data-testid={`latest-upgrade-exile-${code}-add`}
                                      onClick={(
                                        evt: React.MouseEvent<HTMLButtonElement>,
                                      ) => {
                                        evt.stopPropagation();
                                        onAddExile(card, quantity);
                                      }}
                                      tooltip={t(
                                        "deck.latest_upgrade.add_to_deck",
                                      )}
                                    >
                                      <ArrowLeftToLineIcon />
                                    </Button>
                                  )
                                : undefined
                            }
                          />
                        ),
                      )}
                    </ol>
                  </article>
                </PopoverContent>
              </Popover>
            )}
          </div>
        }
      >
        <CollapsibleContent className={css["content"]}>
          {!overflowScroll ? contentNode : <Scroller>{contentNode}</Scroller>}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
