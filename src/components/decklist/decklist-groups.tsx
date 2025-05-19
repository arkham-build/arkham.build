import { useStore } from "@/store";
import {
  type DeckGrouping,
  isGroupCollapsed,
  resolveParents,
  resolveQuantities,
  resolveXP,
} from "@/store/lib/deck-grouping";
import type { GroupingResult } from "@/store/lib/grouping";
import { getDeckLimitOverride } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectForbiddenCards } from "@/store/selectors/decks";
import {
  selectCanCheckOwnership,
  selectCardOwnedCount,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import type { Slots } from "@/store/slices/data.types";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardGridItem } from "../card-list/card-grid";
import { GroupLabel } from "../card-list/grouphead";
import type { FilteredListCardPropsGetter } from "../card-list/types";
import { CardScan } from "../card-scan";
import { CustomizableSheet } from "../customizable-sheet";
import { ListCard } from "../list-card/list-card";
import css from "./decklist-groups.module.css";
import type { ViewMode } from "./decklist.types";

type DecklistGroupsProps = {
  deck: ResolvedDeck;
  grouping: DeckGrouping;
  getListCardProps?: FilteredListCardPropsGetter;
  viewMode?: ViewMode;
  showXP?: boolean;
};

export function DecklistGroup(props: DecklistGroupsProps) {
  const { deck, grouping, getListCardProps, viewMode } = props;

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const canCheckOwnership = useStore(selectCanCheckOwnership);
  const forbiddenCards = useStore((state) => selectForbiddenCards(state, deck));
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
            {parents.map((parent) => (
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
            ))}
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
                deck={deck}
                grouping={grouping}
                group={group}
                getListCardProps={getListCardProps}
              />
            ) : (
              group.cards.map((card: Card) => {
                const listCardProps = getListCardProps?.(card);
                return (
                  <ListCard
                    {...listCardProps}
                    annotation={deck.annotations?.[card.code]}
                    isForbidden={
                      forbiddenCards.find(
                        (x) =>
                          (x.code === card.code ||
                            x.code === card.duplicate_of_code) &&
                          x.target === grouping.id,
                      ) != null
                    }
                    card={card}
                    isRemoved={grouping.quantities?.[card.code] === 0}
                    isIgnored={deck.ignoreDeckLimitSlots?.[card.code]}
                    limitOverride={getDeckLimitOverride(
                      lookupTables,
                      deck,
                      card,
                    )}
                    key={card.code}
                    omitBorders
                    onChangeCardQuantity={
                      grouping.static
                        ? undefined
                        : listCardProps?.onChangeCardQuantity
                    }
                    ownedCount={
                      canCheckOwnership ? cardOwnedCount(card) : undefined
                    }
                    quantity={grouping.quantities?.[card.code] ?? 0}
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

function Scans(props: {
  deck: ResolvedDeck;
  grouping: DeckGrouping;
  group: GroupingResult;
  getListCardProps?: FilteredListCardPropsGetter;
}) {
  const { deck, getListCardProps, group, grouping } = props;

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
      {group.cards.map((card) => (
        <Fragment key={card.code}>
          <li>
            <Scan
              card={card}
              quantities={grouping.quantities}
              getListCardProps={getListCardProps}
            />
          </li>
          {!!card.customization_options && (
            <li>
              <figure className={css["scan"]}>
                <div className={css["scan-images"]}>
                  <CustomizableSheet card={card} deck={deck} />
                </div>
              </figure>
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}

function Scan(props: {
  card: Card;
  quantities: Slots;
  getListCardProps?: FilteredListCardPropsGetter;
}) {
  const { card, getListCardProps, quantities } = props;

  const quantity = quantities[card.code] ?? 0;

  return (
    <figure className={css["scan"]}>
      <div className={css["scan-images"]}>
        {range(0, quantity).map((i) => {
          if (i === 0) {
            return (
              <CardGridItem
                key={i}
                card={card}
                quantities={quantities}
                getListCardProps={getListCardProps}
              />
            );
          }

          return (
            <CardScan
              key={i}
              card={card}
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
    </figure>
  );
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
