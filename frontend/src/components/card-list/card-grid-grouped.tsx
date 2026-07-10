import type { Card } from "@arkham-build/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ListRange, Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Link } from "wouter";
import { useStore } from "@/store";
import type {
  CardGroup as CardGroupType,
  ListState,
} from "@/store/selectors/lists";
import type { Metadata } from "@/store/slices/metadata.types";
import { cx } from "@/utils/cx";
import { preventLeftClick } from "@/utils/prevent-links";
import { CardScan } from "../card-scan";
import { CardFavoriteAction } from "../card-tags/card-favorite";
import { Scroller } from "../ui/scroller";
import { CardActions } from "./card-actions";
import css from "./card-grid.module.css";
import { Grouphead } from "./grouphead";
import type { CardListImplementationProps } from "./types";

export function CardGridGrouped(
  props: CardListImplementationProps & { scanMaxColumns: number },
) {
  const { data, metadata, scanMaxColumns, search, ...rest } = props;

  const openCardModal = useStore((state) => state.openCardModal);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const activeGroup = useRef<string | undefined>(undefined);

  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();
  const [currentTop, setCurrentTop] = useState<number>(-1);

  const onScrollChange = useCallback(() => {
    setCurrentTop(-1);
  }, []);

  useEffect(() => {
    scrollParent?.addEventListener("wheel", onScrollChange, { passive: true });
    return () => {
      scrollParent?.removeEventListener("wheel", onScrollChange);
    };
  }, [scrollParent, onScrollChange]);

  useEffect(() => {
    function onSelectGroup(evt: Event) {
      const key = (evt as CustomEvent).detail;
      const group = data.groups.findIndex((g) => g.key === key);

      if (group === -1) return;

      virtuosoRef.current?.scrollToIndex({
        index: group,
        behavior: "auto",
      });

      activeGroup.current = key;
    }

    function onKeyboardNavigate(evt: Event) {
      const key = (evt as CustomEvent).detail;

      if (!data?.cards.length) return;

      if (key === "Enter" && currentTop > -1) {
        openCardModal(data.cards[currentTop].code);
      }

      if (key === "Escape") {
        setCurrentTop(-1);
      }
    }

    window.addEventListener("list-select-group", onSelectGroup);
    window.addEventListener("list-keyboard-navigate", onKeyboardNavigate);

    return () => {
      window.removeEventListener("list-select-group", onSelectGroup);
      window.removeEventListener("list-keyboard-navigate", onKeyboardNavigate);
    };
  }, [data, openCardModal, currentTop]);

  const rangeChanged = useCallback(
    (range: ListRange) => {
      activeGroup.current = data.groups[range.startIndex].key;
    },
    [data],
  );

  useEffect(() => {
    setCurrentTop(-1);
    activeGroup.current = undefined;
    virtuosoRef.current?.scrollToIndex(0);
  }, [search]);

  /* oxlint-disable react/exhaustive-deps -- a change to card count should reset scroll position. */
  useEffect(() => {
    if (activeGroup.current) {
      const idx = data.groups.findIndex((g) => g.key === activeGroup.current);
      if (idx > -1) {
        virtuosoRef.current?.scrollToIndex(idx);
      } else {
        virtuosoRef.current?.scrollToIndex(0);
      }
    }
  }, [data?.cards.length]);
  /* oxlint-enable react/exhaustive-deps */

  return (
    <Scroller
      className={css["scroller"]}
      data-testid="card-list-scroller"
      padded
      ref={setScrollParent as unknown as React.RefObject<HTMLDivElement | null>}
      type="always"
    >
      {data && (
        <Virtuoso
          customScrollParent={scrollParent}
          ref={virtuosoRef}
          data={data.groups}
          overscan={2}
          rangeChanged={rangeChanged}
          itemContent={(index, group) => (
            <CardGridGroup
              {...rest}
              group={group}
              data={data}
              index={index}
              metadata={metadata}
              scanMaxColumns={scanMaxColumns}
            />
          )}
        />
      )}
    </Scroller>
  );
}

function CardGridGroup(
  props: {
    group: CardGroupType;
    data: ListState;
    index: number;
    metadata: Metadata;
    scanMaxColumns: number;
  } & CardListImplementationProps,
) {
  const { group, data, index, metadata, scanMaxColumns, ...rest } = props;
  const { cards, groupCounts } = data;

  const counts = groupCounts[index];

  const offset =
    index > 0
      ? groupCounts.slice(0, index).reduce((acc, count) => acc + count, 0)
      : 0;

  const groupCards = useMemo(
    () => cards.slice(offset, offset + counts),
    [cards, counts, offset],
  );

  const cssVariables = useMemo(
    () => ({
      "--grid-columns-2": Math.min(2, scanMaxColumns),
      "--grid-columns-3": Math.min(3, scanMaxColumns),
      "--grid-columns-4": Math.min(4, scanMaxColumns),
      "--grid-columns-5": Math.min(5, scanMaxColumns),
      "--grid-columns-6": Math.min(6, scanMaxColumns),
    }),
    [scanMaxColumns],
  );

  return (
    <div className={css["group"]} key={group.key}>
      <Grouphead
        className={css["group-header"]}
        grouping={group}
        metadata={metadata}
      />
      <div
        className={cx(css["group-items"], css["grouped"])}
        style={cssVariables as React.CSSProperties}
      >
        {groupCards.map((card) => (
          <CardGridItem {...rest} card={card} key={card.code} />
        ))}
      </div>
    </div>
  );
}

function CardGridItem(
  props: {
    card: Card;
  } & Pick<
    CardListImplementationProps,
    "getListCardProps" | "quantities" | "resolvedDeck"
  >,
) {
  const { card, getListCardProps, quantities } = props;

  const openCardModal = useStore((state) => state.openCardModal);

  const openModal = useCallback(() => {
    openCardModal(card.code);
  }, [openCardModal, card.code]);

  const onClick = useCallback(
    (evt: React.MouseEvent) => {
      const linkPrevented = preventLeftClick(evt);
      if (linkPrevented) openModal();
    },
    [openModal],
  );

  const onPressEnter = useCallback(
    (evt: React.KeyboardEvent) => {
      if (evt.key === "Enter" && evt.target === evt.currentTarget) {
        openModal();
      }
    },
    [openModal],
  );

  const quantity = quantities?.[card.code] ?? 0;

  return (
    <div
      className={css["group-item"]}
      key={card.code}
      data-component="card-group-item"
    >
      <Link
        href={`~/card/${card.code}`}
        className={css["group-item-scan"]}
        onClick={onClick}
        onKeyUp={onPressEnter}
        tabIndex={0}
      >
        <CardScan
          card={card}
          lazy
          leftActionSlot={<CardFavoriteAction card={card} />}
        />
      </Link>
      <div className={css["group-item-actions"]}>
        <CardActions
          card={card}
          quantity={quantities ? quantity : undefined}
          listCardProps={getListCardProps?.(card)}
        />
      </div>
    </div>
  );
}
