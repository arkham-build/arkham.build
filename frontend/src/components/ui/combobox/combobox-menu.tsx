/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO: implement. */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: item might nest button elements. */
import { CheckIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupedVirtuosoHandle } from "react-virtuoso";
import { Virtuoso } from "react-virtuoso";
import type { Coded } from "@/store/lib/types";
import { cx } from "@/utils/cx";
import { Scroller } from "../scroller";
import css from "./combobox.module.css";

type Props<T extends Coded> = {
  activeIndex: number | undefined;
  items: T[];
  listRef: React.MutableRefObject<HTMLElement[]>;
  omitItemPadding?: boolean;
  renderItem: (t: T) => React.ReactNode;
  selectedItems: (T | undefined)[];
  setActiveIndex: (i: number) => void;
  setSelectedItem: (t: T) => void;
};

export function ComboboxMenu<T extends Coded>(props: Props<T>) {
  const {
    activeIndex,
    items,
    listRef,
    omitItemPadding,
    renderItem,
    selectedItems,
    setActiveIndex,
    setSelectedItem,
  } = props;

  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);

  const mouseOverIndex = useRef<number | null>(null);

  useEffect(() => {
    if (
      activeIndex != null &&
      virtuosoRef.current &&
      mouseOverIndex.current !== activeIndex
    ) {
      virtuosoRef.current.scrollIntoView({
        index: activeIndex,
        behavior: "auto",
      });
    }
  }, [activeIndex]);

  const cssVariables = useMemo(
    () => ({
      "--viewport-item-count": items.length,
    }),
    [items],
  );

  return (
    <Scroller
      ref={setScrollParent as unknown as React.RefObject<HTMLDivElement>}
      style={cssVariables as React.CSSProperties}
      viewportClassName={css["menu-viewport"]}
    >
      <Virtuoso
        customScrollParent={scrollParent}
        data={items}
        itemContent={(index, item) => {
          const active = activeIndex === index;
          return (
            <div
              className={cx(
                css["menu-item"],
                active && css["active"],
                !omitItemPadding && css["padded"],
              )}
              data-testid={`combobox-menu-item-${item.code}`}
              id={item.code}
              onClick={(evt) => {
                evt.stopPropagation();
                setSelectedItem(item);
              }}
              onPointerOver={() => {
                mouseOverIndex.current = index;
                setActiveIndex(index);
              }}
              ref={(node) => {
                if (node instanceof HTMLElement) {
                  listRef.current[index] = node;
                }
              }}
              tabIndex={active ? 0 : -1}
            >
              {selectedItems.find((s) => s?.code === item.code) && (
                <CheckIcon className={css["menu-item-check"]} />
              )}
              {renderItem(item)}
            </div>
          );
        }}
        ref={virtuosoRef}
      />
    </Scroller>
  );
}
