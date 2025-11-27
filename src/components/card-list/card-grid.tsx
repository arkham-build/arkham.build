import { useCallback, useEffect, useRef, useState } from "react";
import { VirtuosoGrid, type VirtuosoHandle } from "react-virtuoso";
import { Link } from "wouter";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import { cx } from "@/utils/cx";
import { preventLeftClick } from "@/utils/prevent-links";
import { CardScan } from "../card-scan";
import { Scroller } from "../ui/scroller";
import { CardActions } from "./card-actions";
import css from "./card-grid.module.css";
import type { CardListImplementationProps } from "./types";

export function CardGrid(props: CardListImplementationProps) {
  const { data, search, ...rest } = props;

  const openCardModal = useStore((state) => state.openCardModal);

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();
  const [currentTop, setCurrentTop] = useState<number>(-1);
  const [highlighted, setHighlighted] = useState<number | null>(null);

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

      const cardAtOffset = data.groups
        .slice(0, group)
        .reduce((acc, _, idx) => acc + data.groupCounts[idx], 0);

      setHighlighted(cardAtOffset);

      virtuosoRef.current?.scrollToIndex({
        index: cardAtOffset,
        behavior: "auto",
      });
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: a search should reset scroll position.
  useEffect(() => {
    setCurrentTop(-1);
    virtuosoRef.current?.scrollToIndex(0);
  }, [search, data?.cards.length, rest.listDisplay]);

  return (
    <Scroller
      className={css["scroller"]}
      data-testid="card-list-scroller"
      ref={setScrollParent as unknown as React.RefObject<HTMLDivElement>}
      type="always"
    >
      {data && (
        <VirtuosoGrid
          customScrollParent={scrollParent}
          ref={virtuosoRef}
          data={data.cards}
          listClassName={css["group-items"]}
          itemClassName={css["group-item"]}
          itemContent={(index) => (
            <CardGridItem
              {...rest}
              card={data.cards[index]}
              key={data.cards[index].id}
              highlighted={highlighted === index}
            />
          )}
        />
      )}
    </Scroller>
  );
}

export function CardGridItem(
  props: {
    card: Card;
    highlighted?: boolean;
  } & Pick<
    CardListImplementationProps,
    "getListCardProps" | "quantities" | "resolvedDeck"
  >,
) {
  const { card, highlighted, getListCardProps, quantities } = props;

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
        className={cx(
          css["group-item-scan"],
          highlighted && css["highlighted"],
        )}
        onClick={onClick}
        onKeyUp={onPressEnter}
        tabIndex={0}
      >
        <CardScan card={card} lazy />
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
