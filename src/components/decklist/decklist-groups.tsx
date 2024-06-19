import clsx from "clsx";

import { useStore } from "@/store";
import type { Grouping } from "@/store/lib/deck-grouping";
import { sortByName, sortBySlots, sortTypesByOrder } from "@/store/lib/sorting";
import { selectForbiddenCards } from "@/store/selectors/decks";
import { selectCanCheckOwnership } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import { capitalize } from "@/utils/formatting";

import css from "./decklist-groups.module.css";

import SlotIcon from "../icons/slot-icon";
import { ListCard } from "../list-card/list-card";

type Props = {
  canEdit?: boolean;
  group: Grouping;
  ignoredCounts?: Record<string, number>;
  onOpenModal?: (code: string) => void;
  quantities?: Record<string, number>;
  layout: "one_column" | "two_column";
  mapping: string;
  ownershipCounts: Record<string, number>;
};

export function DecklistGroups({
  canEdit,
  group,
  ignoredCounts,
  layout,
  mapping,
  onOpenModal,
  ownershipCounts,
  quantities,
}: Props) {
  const assetGroup = group["asset"] ? (
    <li className={clsx(css["group"], css["asset"])}>
      <h4 className={css["group-title"]}>Asset</h4>
      <ol className={css["group-children"]}>
        {Object.entries(group["asset"] as Record<string, Card[]>)
          .toSorted(([a], [b]) => sortBySlots(a, b))
          .map(([key, val]) => {
            return (
              <li className={css["group-child"]} key={key}>
                <h5 className={css["group-entry_nested-title"]}>
                  <SlotIcon code={key} />
                  {capitalize(key)}
                </h5>
                <DecklistGroup
                  canEdit={canEdit}
                  cards={val}
                  ignoredCounts={ignoredCounts}
                  mapping={mapping}
                  onOpenModal={onOpenModal}
                  ownershipCounts={ownershipCounts}
                  quantities={quantities}
                />
              </li>
            );
          })}
      </ol>
    </li>
  ) : null;

  const rest = Object.keys(group)
    .filter((g) => g !== "asset")
    .toSorted(sortTypesByOrder)
    .map((key) => {
      const k = key as keyof Grouping;
      const entry = group[k] as Card[];
      if (!entry) return null;
      return (
        <li className={clsx(css["group"])} key={k}>
          <h4 className={css["group-title"]}>{capitalize(k)}</h4>
          <DecklistGroup
            cards={entry}
            ignoredCounts={ignoredCounts}
            mapping={mapping}
            ownershipCounts={ownershipCounts}
            quantities={quantities}
          />
        </li>
      );
    });

  return layout === "one_column" ? (
    <ol className={css["group_one-col"]}>
      {assetGroup}
      {rest}
    </ol>
  ) : (
    <div className={css["group_two-cols"]}>
      {assetGroup}
      <ol>{rest}</ol>
    </div>
  );
}

type DecklistGroupProps = {
  canEdit?: boolean;
  cards: Card[];
  ignoredCounts?: Record<string, number>;
  mapping: string;
  onOpenModal?: (code: string) => void;
  ownershipCounts: Record<string, number>;
  quantities?: Record<string, number>;
};

export function DecklistGroup({
  canEdit: _canEdit,
  cards,
  ignoredCounts,
  mapping,
  onOpenModal,
  ownershipCounts,
  quantities,
}: DecklistGroupProps) {
  const forbiddenCards = useStore(selectForbiddenCards);
  const canEdit = _canEdit && mapping !== "bonded";
  const canCheckOwnership = useStore(selectCanCheckOwnership);
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  return (
    <ol>
      {cards.toSorted(sortByName).map((card) => (
        <ListCard
          as="li"
          canCheckOwnership={canCheckOwnership}
          canIndicateRemoval
          card={card}
          isForbidden={
            forbiddenCards.find(
              (x) => x.code === card.code && x.target === mapping,
            ) != null
          }
          isIgnored={ignoredCounts?.[card.code]}
          key={card.code}
          omitBorders
          onChangeCardQuantity={canEdit ? updateCardQuantity : undefined}
          onOpenModal={onOpenModal}
          owned={ownershipCounts[card.code]}
          quantities={quantities}
          size="sm"
        />
      ))}
    </ol>
  );
}
