import type { Card, Slots } from "@arkham-build/shared";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  type DeckGrouping,
  isGroupCollapsed,
  resolveParents,
  resolveQuantities,
  resolveXP,
} from "@/store/lib/deck-grouping";
import { type GroupingResult, NONE } from "@/store/lib/grouping";
import { getDeckLimitOverride } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectCardsNotInLimitedPool,
  selectForbiddenCards,
} from "@/store/selectors/decks";
import {
  selectCanCheckOwnership,
  selectCardOwnedCount,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { ViewMode } from "@/store/slices/lists.types";
import { displayAttribute } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import { CardGridItem } from "../card-list/card-grid";
import { GroupLabel } from "../card-list/grouphead";
import type { FilteredListCardPropsGetter } from "../card-list/types";
import { CardScan } from "../card-scan";
import { useCardTagsListCard } from "../card-tags/use-card-tags-list-card";
import { CustomizableSheet } from "../customizable-sheet";
import { ListCard } from "../list-card/list-card";
import { Checkbox } from "../ui/checkbox";
import css from "./decklist-groups.module.css";

type DecklistGroupsProps = {
  checkedCardQuantities?: ReadonlyMap<string, number>;
  deck: ResolvedDeck;
  grouping: DeckGrouping;
  getListCardProps?: FilteredListCardPropsGetter;
  onCardCheckedQuantityChange?(cardKey: string, quantity: number): void;
  viewMode?: ViewMode;
  showXP?: boolean;
  showCardTags?: boolean;
};

export function DecklistGroup(props: DecklistGroupsProps) {
  const {
    checkedCardQuantities,
    deck,
    grouping,
    getListCardProps,
    onCardCheckedQuantityChange,
    showCardTags = true,
    viewMode,
  } = props;

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const canCheckOwnership = useStore(selectCanCheckOwnership);
  const forbiddenCards = useStore((state) => selectForbiddenCards(state, deck));
  const cardsNotInLimitedPool = useStore((state) =>
    selectCardsNotInLimitedPool(state, deck),
  );
  const cardOwnedCount = useStore(selectCardOwnedCount);

  const quantities = resolveQuantities(grouping);
  const xp = resolveXP(grouping);

  const seenParents = new Set<string>();

  return (
    <>
      {grouping.data.map((group) => {
        if (!group.cards.length) return null;

        const parents = resolveParents(grouping, group).filter(
          (parent) => !seenParents.has(parent.key),
        );

        for (const parent of parents) {
          seenParents.add(parent.key);
        }

        return (
          <div
            className={cx(css["container"], viewMode && css[viewMode])}
            key={group.key}
          >
            {parents.map(
              (parent) =>
                parent.key !== NONE && (
                  <h2 className={css["title"]} key={parent.key}>
                    <GroupLabel
                      className={css["label"]}
                      type={parent.type.split("|").at(-1) as string}
                      segment={parent.key.split("|").at(-1) as string}
                      metadata={metadata}
                    />
                    <GroupQuantity quantity={quantities.get(parent.key) ?? 0} />
                    {props.showXP && (
                      <GroupExtraInfo text={`${xp.get(parent.key) ?? 0}`} />
                    )}
                  </h2>
                ),
            )}
            {!isGroupCollapsed(group) && (
              <h3
                className={
                  group.key.split("|").length === 1
                    ? css["title"]
                    : css["subtitle"]
                }
              >
                <GroupLabel
                  className={css["label"]}
                  type={group.type.split("|").at(-1) as string}
                  segment={group.key.split("|").at(-1) as string}
                  metadata={metadata}
                />
                <GroupQuantity quantity={quantities.get(group.key) ?? 0} />
              </h3>
            )}
            {viewMode === "scans" ? (
              <Scans
                checkedCardQuantities={checkedCardQuantities}
                deck={deck}
                grouping={grouping}
                group={group}
                getListCardProps={getListCardProps}
                onCardCheckedQuantityChange={onCardCheckedQuantityChange}
              />
            ) : (
              group.cards.map((card: Card) => {
                const listCardProps = getListCardProps?.(card);
                const cardKey = getChecklistCardKey(grouping, card);
                const checklist = checkedCardQuantities
                  ? {
                      checkedQuantity: checkedCardQuantities.get(cardKey) ?? 0,
                      onCheckedQuantityChange: (quantity: number) =>
                        onCardCheckedQuantityChange?.(cardKey, quantity),
                    }
                  : undefined;

                return (
                  <DecklistCard
                    card={card}
                    deck={deck}
                    checklist={checklist}
                    isCardNotInLimitedPool={
                      cardsNotInLimitedPool.find(
                        (x) =>
                          x.code === card.code ||
                          x.code === card.duplicate_of_code,
                      ) != null
                    }
                    isForbidden={
                      forbiddenCards.find(
                        (x) =>
                          (x.code === card.code ||
                            x.code === card.duplicate_of_code) &&
                          x.target === grouping.id,
                      ) != null
                    }
                    isIgnored={deck.ignoreDeckLimitSlots?.[card.code]}
                    isRemoved={grouping.quantities?.[card.code] === 0}
                    key={card.code}
                    limitOverride={getDeckLimitOverride(
                      lookupTables,
                      deck,
                      card,
                    )}
                    listCardProps={listCardProps}
                    onChangeCardQuantity={
                      grouping.static
                        ? undefined
                        : listCardProps?.onChangeCardQuantity
                    }
                    ownedCount={
                      canCheckOwnership ? cardOwnedCount(card) : undefined
                    }
                    quantity={grouping.quantities?.[card.code] ?? 0}
                    showCardTags={showCardTags}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </>
  );
}

function DecklistCard({
  card,
  checklist,
  deck,
  isCardNotInLimitedPool,
  isForbidden,
  isIgnored,
  isRemoved,
  limitOverride,
  listCardProps,
  onChangeCardQuantity,
  ownedCount,
  quantity,
  showCardTags,
}: {
  card: Card;
  checklist?: ChecklistState;
  deck: ResolvedDeck;
  isCardNotInLimitedPool: boolean;
  isForbidden: boolean;
  isIgnored?: number;
  isRemoved: boolean;
  limitOverride?: number;
  listCardProps?: ReturnType<FilteredListCardPropsGetter>;
  onChangeCardQuantity?: ReturnType<FilteredListCardPropsGetter>["onChangeCardQuantity"];
  ownedCount?: number;
  quantity: number;
  showCardTags: boolean;
}) {
  const {
    renderCardExtra: renderCardExtraProp,
    renderCardTags: renderCardTagsProp,
    ...restListCardProps
  } = listCardProps ?? {};

  const { renderCardTags } = useCardTagsListCard(card, deck, {
    respectCardTagSetting: false,
  });

  return (
    <ListCard
      {...restListCardProps}
      annotation={deck.annotations?.[card.code]}
      card={card}
      isCardNotInLimitedPool={isCardNotInLimitedPool}
      isFaded={quantity > 0 && checklist?.checkedQuantity === quantity}
      isForbidden={isForbidden}
      isIgnored={isIgnored}
      isRemoved={isRemoved}
      limitOverride={limitOverride}
      omitBorders
      onChangeCardQuantity={onChangeCardQuantity}
      ownedCount={ownedCount}
      quantity={quantity}
      renderCardExtra={
        checklist
          ? () => (
              <ChecklistCheckboxGroup
                card={card}
                checkedQuantity={checklist.checkedQuantity}
                onCheckedQuantityChange={checklist.onCheckedQuantityChange}
                quantity={quantity}
              />
            )
          : renderCardExtraProp
      }
      renderCardTags={
        showCardTags ? (renderCardTags ?? renderCardTagsProp) : undefined
      }
    />
  );
}

function Scans(props: {
  checkedCardQuantities?: ReadonlyMap<string, number>;
  deck: ResolvedDeck;
  grouping: DeckGrouping;
  group: GroupingResult;
  getListCardProps?: FilteredListCardPropsGetter;
  onCardCheckedQuantityChange?(cardKey: string, quantity: number): void;
}) {
  const {
    checkedCardQuantities,
    deck,
    getListCardProps,
    group,
    grouping,
    onCardCheckedQuantityChange,
  } = props;

  const styles = useMemo(
    () =>
      ({
        "--scan-levels": Math.max(
          ...group.cards.map((card) => grouping.quantities[card.code] ?? 0),
        ),
      }) as React.CSSProperties,
    [grouping.quantities, group.cards],
  );

  return (
    <ol className={css["grid"]} style={styles}>
      {group.cards.map((card) => {
        const cardKey = getChecklistCardKey(grouping, card);
        const checklist = checkedCardQuantities
          ? {
              checkedQuantity: checkedCardQuantities.get(cardKey) ?? 0,
              onCheckedQuantityChange: (quantity: number) =>
                onCardCheckedQuantityChange?.(cardKey, quantity),
            }
          : undefined;

        return (
          <Fragment key={card.code}>
            <li>
              <Scan
                card={card}
                checklist={checklist}
                quantities={grouping.quantities}
                getListCardProps={getListCardProps}
              />
            </li>
            {!!card.customization_options && card.official && (
              <li>
                <figure className={css["scan"]}>
                  <div className={css["scan-images"]}>
                    <CustomizableSheet card={card} deck={deck} />
                  </div>
                </figure>
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

function Scan(props: {
  card: Card;
  checklist?: ChecklistState;
  quantities: Slots;
  getListCardProps?: FilteredListCardPropsGetter;
}) {
  const { card, checklist, getListCardProps, quantities } = props;

  const quantity = quantities[card.code] ?? 0;
  const isComplete = checklist?.checkedQuantity === quantity;

  return (
    <figure className={css["scan"]}>
      <div
        className={cx(
          css["scan-images"],
          isComplete && css["scan-group-collected"],
        )}
      >
        {range(0, quantity).map((i) => {
          const isCollected =
            checklist && !isComplete
              ? isScanCopyCollected(i, quantity, checklist.checkedQuantity)
              : false;

          const copyClassName = cx(
            css["scan-copy"],
            isCollected && css["scan-copy-collected"],
          );

          if (i === 0) {
            return (
              <CardGridItem
                card={card}
                className={copyClassName}
                key={i}
                omitFavorite
                quantities={quantities}
                getListCardProps={getListCardProps}
              />
            );
          }

          return (
            <CardScan
              card={card}
              className={copyClassName}
              key={i}
              preventFlip
              style={
                {
                  "--scan-level": i,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>
      {checklist && (
        <ScanChecklistToggle
          card={card}
          checkedQuantity={checklist.checkedQuantity}
          onCheckedQuantityChange={checklist.onCheckedQuantityChange}
          quantity={quantity}
        />
      )}
    </figure>
  );
}

function ScanChecklistToggle(props: {
  card: Card;
  checkedQuantity: number;
  onCheckedQuantityChange(quantity: number): void;
  quantity: number;
}) {
  const { card, checkedQuantity, onCheckedQuantityChange, quantity } = props;
  const { t } = useTranslation();

  return (
    <button
      aria-label={t("deck_view.actions.check_card", {
        card: displayAttribute(card, "name"),
      })}
      aria-pressed={checkedQuantity === quantity}
      className={css["scan-checklist-toggle"]}
      onClick={() =>
        onCheckedQuantityChange((checkedQuantity + 1) % (quantity + 1))
      }
      type="button"
    />
  );
}

function ChecklistCheckboxGroup(props: {
  card: Card;
  checkedQuantity: number;
  onCheckedQuantityChange(quantity: number): void;
  quantity: number;
}) {
  const { card, checkedQuantity, onCheckedQuantityChange, quantity } = props;
  const { t } = useTranslation();

  return range(0, quantity).map((i) => (
    <Checkbox
      checked={i < checkedQuantity}
      className={css["list-checkbox"]}
      hideLabel
      key={i}
      label={t("deck_view.actions.check_card", {
        card: `${displayAttribute(card, "name")} (${i + 1}/${quantity})`,
      })}
      onCheckedChange={(checked) =>
        onCheckedQuantityChange(checked ? i + 1 : i)
      }
    />
  ));
}

function isScanCopyCollected(
  copyIndex: number,
  quantity: number,
  checkedQuantity: number,
) {
  const collectionOrder = copyIndex === 0 ? quantity : quantity - copyIndex;
  return checkedQuantity >= collectionOrder;
}

type ChecklistState = {
  checkedQuantity: number;
  onCheckedQuantityChange(quantity: number): void;
};

function getChecklistCardKey(grouping: DeckGrouping, card: Card) {
  return `${grouping.id}:${card.code}`;
}

function GroupQuantity(props: { quantity: number }) {
  return <span className={css["group-quantity"]}>{props.quantity}</span>;
}

function GroupExtraInfo(props: { text: string }) {
  const { t } = useTranslation();

  return (
    <span className={css["group-extra-info"]}>
      ({`${props.text} ${t("common.xp")}`})
    </span>
  );
}
