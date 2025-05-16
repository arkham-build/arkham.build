import { useStore } from "@/store";
import { getDeckLimitOverride } from "@/store/lib/resolve-deck";
import type { ListState } from "@/store/selectors/lists";
import {
  selectCanCheckOwnership,
  selectCardOwnedCount,
  selectLookupTables,
} from "@/store/selectors/shared";
import { range } from "@/utils/range";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupedVirtuosoHandle, ListRange } from "react-virtuoso";
import { GroupedVirtuoso, Virtuoso } from "react-virtuoso";
import { useCardModalContextChecked } from "../card-modal/card-modal-context";
import { Scroller } from "../ui/scroller";
import { CardListItemCompact, CardListItemFull } from "./card-list-items";
import css from "./card-list.module.css";
import { Grouphead } from "./grouphead";
import type { CardListImplementationProps } from "./types";

export function CardList(props: CardListImplementationProps) {
  const {
    data,
    metadata,
    quantities,
    listMode,
    getListCardProps,
    resolvedDeck,
    search,
    viewMode,
  } = props;

  const modalContext = useCardModalContextChecked();

  const showAltHead = viewMode === "card-text";

  const [currentTop, setCurrentTop] = useState<number>(-1);
  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();

  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const activeRange = useRef<ListRange | undefined>(undefined);
  const activeGroup = useRef<string | undefined>(undefined);
  const canCheckOwnerhip = useStore(selectCanCheckOwnership);
  const cardOwnedCount = useStore(selectCardOwnedCount);
  const lookupTables = useStore(selectLookupTables);

  const onScrollChange = useCallback(() => {
    setCurrentTop(-1);
  }, []);

  useEffect(() => {
    scrollParent?.addEventListener("wheel", onScrollChange, { passive: true });
    return () => {
      scrollParent?.removeEventListener("wheel", onScrollChange);
    };
  }, [scrollParent, onScrollChange]);

  const onSelectGroup = useCallback(
    (evt: Event) => {
      const offset = findGroupOffset(data, (evt as CustomEvent).detail);

      if (offset != null) {
        virtuosoRef.current?.scrollToIndex(offset);
      } else {
        virtuosoRef.current?.scrollToIndex(0);
      }
    },
    [data],
  );

  const onKeyboardNavigate = useCallback(
    (evt: Event) => {
      const key = (evt as CustomEvent).detail;

      if (!data?.cards.length) return;

      if (key === "ArrowUp" || key === "ArrowDown") {
        const keyboardIdx = activeRange.current?.startIndex
          ? Math.max(activeRange.current?.startIndex, currentTop)
          : currentTop;

        const idx =
          key === "ArrowUp"
            ? Math.max(keyboardIdx - 1, 0)
            : Math.min(keyboardIdx + 1, data.cards.length - 1);

        setCurrentTop(idx);

        if (
          !activeRange.current ||
          (activeRange.current &&
            (idx >= activeRange.current.endIndex ||
              idx <= activeRange.current.startIndex))
        ) {
          virtuosoRef.current?.scrollToIndex(idx);
        }
      }

      if (key === "Enter" && currentTop > -1) {
        modalContext.setOpen({
          code: data.cards[currentTop].code,
        });
      }

      if (key === "Escape") {
        setCurrentTop(-1);
      }
    },
    [currentTop, data, modalContext.setOpen],
  );

  useEffect(() => {
    window.addEventListener("list-keyboard-navigate", onKeyboardNavigate);
    window.addEventListener("list-select-group", onSelectGroup);

    return () => {
      window.removeEventListener("list-keyboard-navigate", onKeyboardNavigate);
      window.removeEventListener("list-select-group", onSelectGroup);
    };
  }, [onKeyboardNavigate, onSelectGroup]);

  const onScrollStop = useCallback(
    (scrolling: boolean) => {
      if (!scrolling) {
        virtuosoRef.current?.getState(() => {
          activeGroup.current = findActiveGroup(activeRange.current, data);
        });
      }
    },
    [data],
  );

  const rangeChanged = useCallback((range: ListRange) => {
    activeRange.current = range;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a search should reset scroll position.
  useEffect(() => {
    setCurrentTop(-1);
    activeGroup.current = undefined;
    activeRange.current = undefined;
    virtuosoRef.current?.scrollToIndex(0);
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change to card count should reset scroll position.
  useEffect(() => {
    if (activeGroup.current) {
      const offset = findGroupOffset(data, activeGroup.current);
      virtuosoRef.current?.scrollToIndex(offset ?? 0);
    } else {
      virtuosoRef.current?.scrollToIndex(0);
    }
  }, [data?.cards.length]);

  const makeItemContent = (index: number, currentTop: number) => {
    const card = data.cards[index];

    const itemProps = {
      listCardProps: {
        ...getListCardProps?.(card),
        limitOverride: getDeckLimitOverride(
          lookupTables,
          resolvedDeck,
          data.cards[index],
        ),
        ownedCount: canCheckOwnerhip
          ? cardOwnedCount(data.cards[index])
          : undefined,
      },
      card,
      quantity: quantities
        ? (quantities[data.cards[index].code] ?? 0)
        : undefined,
      currentTop,
      index,
      resolvedDeck,
      viewMode,
    };

    if (viewMode === "full-cards") {
      return <CardListItemFull {...itemProps} />;
    }

    return <CardListItemCompact {...itemProps} />;
  };

  return (
    <Scroller
      className={css["scroller"]}
      data-testid="card-list-scroller"
      ref={setScrollParent as unknown as React.RefObject<HTMLDivElement>}
      type="always"
    >
      {viewMode !== "scans" &&
        data &&
        scrollParent &&
        (listMode === "single" ? (
          <Virtuoso
            context={{ currentTop }}
            customScrollParent={scrollParent}
            data={data.cards}
            isScrolling={onScrollStop}
            itemContent={(index, _, { currentTop }) =>
              makeItemContent(index, currentTop)
            }
            rangeChanged={rangeChanged}
            ref={virtuosoRef}
          />
        ) : (
          <GroupedVirtuoso
            context={{ currentTop }}
            customScrollParent={scrollParent}
            groupContent={(index) => (
              <Grouphead
                grouping={data.groups[index]}
                metadata={metadata}
                variant={showAltHead ? "alt" : undefined}
              />
            )}
            groupCounts={data.groupCounts}
            isScrolling={onScrollStop}
            itemContent={(index, _, __, { currentTop }) =>
              makeItemContent(index, currentTop)
            }
            key={`${data.key}-${viewMode}`}
            rangeChanged={rangeChanged}
            ref={virtuosoRef}
          />
        ))}
    </Scroller>
  );
}

function findGroupOffset(
  data: ListState | undefined,
  code: string | number,
): number | undefined {
  if (!data) return undefined;

  const groupIndex = data.groups.findIndex((g) => g.key === code);
  if (groupIndex === -1) return undefined;

  return range(0, groupIndex).reduce((acc, i) => acc + data.groupCounts[i], 0);
}

function findActiveGroup(
  activeRange: ListRange | undefined,
  data: ListState | undefined,
) {
  if (!activeRange || !data?.groupCounts || !data.groups.length)
    return undefined;

  // if there is an active group, figure out which one it is by walking the group counts
  // until we find the one containing the index.
  const groupIndex = activeRange.startIndex + 1;
  let sum = 0;
  let i = 0;

  for (const len of data.groupCounts) {
    sum += len;
    if (groupIndex <= sum) {
      break;
    }

    i += 1;
  }

  return data.groups[i].key;
}
