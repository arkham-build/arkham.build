import type { Card } from "@arkham-build/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Link } from "wouter";
import { useStore } from "@/store";
import { cx } from "@/utils/cx";
import { preventLeftClick } from "@/utils/prevent-links";
import { useMeasure } from "@/utils/use-measure";
import { CardScan } from "../card-scan";
import { Scroller } from "../ui/scroller";
import { CardActions } from "./card-actions";
import css from "./card-grid.module.css";
import type { CardListImplementationProps } from "./types";

export function CardGrid(props: CardListImplementationProps) {
  const { data, search, ...rest } = props;

  const openCardModal = useStore((state) => state.openCardModal);

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const [scrollParent, setScrollParentState] = useState<
    HTMLElement | undefined
  >();
  const [currentTop, setCurrentTop] = useState<number>(-1);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const [setMeasureRef, rect] = useMeasure();

  const onScrollChange = useCallback(() => {
    setCurrentTop(-1);
  }, []);

  useEffect(() => {
    scrollParent?.addEventListener("wheel", onScrollChange, { passive: true });
    return () => {
      scrollParent?.removeEventListener("wheel", onScrollChange);
    };
  }, [scrollParent, onScrollChange]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a search should reset scroll position.
  useEffect(() => {
    setCurrentTop(-1);
    virtuosoRef.current?.scrollToIndex(0);
  }, [search, data?.cards.length, rest.listDisplay]);

  const setScrollParent = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        setScrollParentState(el);
        setMeasureRef(el);
      }
    },
    [setMeasureRef],
  );

  const cols = useMemo(() => {
    const w = rect?.width ?? 0;
    if (w >= 1152) return 6;
    if (w >= 960) return 5;
    if (w >= 720) return 4;
    if (w >= 528) return 3;
    if (w >= 320) return 2;
    return 1;
  }, [rect]);

  // Determine the default orientation of cards in the list.
  // This prevents lists from becoming jumpy when they overwhelmingly consist of horizontal cards.
  const defaultOrientation = useMemo(() => {
    return data.cards.reduce(
      (acc, curr) => {
        if (
          curr.type_code === "act" ||
          curr.type_code === "agenda" ||
          curr.type_code === "investigator"
        ) {
          acc.horizontal += 1;
        } else {
          acc.vertical += 1;
        }

        return acc;
      },
      { horizontal: 0, vertical: 0 },
    );
  }, [data.cards]);

  const orientationModifier =
    defaultOrientation.horizontal > defaultOrientation.vertical
      ? 300 / 420
      : 420 / 300;

  const rows = useMemo(() => {
    if (!data) return [];

    const rowCards: Card[][] = [];

    for (let i = 0; i < data.cards.length; i += cols) {
      rowCards.push(data.cards.slice(i, i + cols));
    }

    return rowCards;
  }, [data, cols]);

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
        index: cardAtOffset / cols - 1,
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
  }, [data, openCardModal, currentTop, cols]);

  return (
    <Scroller
      className={css["scroller"]}
      data-testid="card-list-scroller"
      ref={setScrollParent as unknown as React.RefObject<HTMLDivElement>}
      type="always"
    >
      {rect?.width && data && (
        <Virtuoso
          customScrollParent={scrollParent}
          ref={virtuosoRef}
          key={orientationModifier}
          defaultItemHeight={
            16 + (orientationModifier * (rect.width - 16 * (cols - 1))) / cols
          }
          data={rows}
          increaseViewportBy={6}
          skipAnimationFrameInResizeObserver
          itemContent={(_, cards) => (
            <div
              className={css["group-items"]}
              style={{ "--columns": cols } as React.CSSProperties}
            >
              {cards.map((card) => (
                <CardGridItem
                  {...rest}
                  card={card}
                  key={card.id}
                  highlighted={
                    highlighted !== null &&
                    data.cards.indexOf(card) === highlighted
                  }
                />
              ))}
            </div>
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
