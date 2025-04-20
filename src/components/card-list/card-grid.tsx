import type {
  CardGroup as CardGroupType,
  ListState,
} from "@/store/selectors/lists";
import type { Card } from "@/store/services/queries.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ListRange, Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useCardModalContextChecked } from "../card-modal/card-modal-context";
import { CardScan } from "../card-scan";
import { Scroller } from "../ui/scroller";
import { CardActions } from "./card-actions";
import css from "./card-grid.module.css";
import { Grouphead } from "./grouphead";
import type { CardListImplementationProps } from "./types";

export function CardGrid(props: CardListImplementationProps) {
  const { data, metadata, search, ...rest } = props;

  const modalContext = useCardModalContextChecked();

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
        modalContext.setOpen({
          code: data.cards[currentTop].code,
        });
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
  }, [data, modalContext.setOpen, currentTop]);

  const rangeChanged = useCallback(
    (range: ListRange) => {
      activeGroup.current = data.groups[range.startIndex].key;
    },
    [data],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: a search should reset scroll position.
  useEffect(() => {
    setCurrentTop(-1);
    activeGroup.current = undefined;
    virtuosoRef.current?.scrollToIndex(0);
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change to card count should reset scroll position.
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

  return (
    <Scroller
      className={css["scroller"]}
      data-testid="card-list-scroller"
      ref={setScrollParent as unknown as React.RefObject<HTMLDivElement>}
      type="always"
    >
      {data && (
        <Virtuoso
          customScrollParent={scrollParent}
          ref={virtuosoRef}
          data={data.groups}
          defaultItemHeight={400}
          overscan={2}
          rangeChanged={rangeChanged}
          itemContent={(index, group) => (
            <CardGridGroup
              {...rest}
              group={group}
              data={data}
              index={index}
              metadata={metadata}
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
  } & CardListImplementationProps,
) {
  const { group, data, index, metadata, ...rest } = props;
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

  return (
    <div className={css["group"]} key={group.key}>
      <Grouphead
        className={css["group-header"]}
        grouping={group}
        metadata={metadata}
      />
      <div className={css["group-items"]}>
        {groupCards.map((card) => (
          <CardGridItem {...rest} card={card} key={card.code} />
        ))}
      </div>
    </div>
  );
}

export function CardGridItem(
  props: {
    card: Card;
  } & Pick<
    CardListImplementationProps,
    "getListCardProps" | "quantities" | "resolvedDeck"
  >,
) {
  const { card, getListCardProps, quantities } = props;

  const modalContext = useCardModalContextChecked();

  const openModal = useCallback(() => {
    modalContext.setOpen({ code: card.code });
  }, [modalContext, card.code]);

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
      <div
        className={css["group-item-scan"]}
        onClick={openModal}
        onKeyUp={onPressEnter}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: needs a tabIndex to avoid focus jumping to parent when modal opened.
        tabIndex={0}
      >
        <CardScan card={card} lazy />
      </div>
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
