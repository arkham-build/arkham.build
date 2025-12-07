import { forwardRef, useCallback, useEffect } from "react";
import { CenterLayout } from "@/layouts/center-layout";
import { useStore } from "@/store";
import {
  selectActiveListSearch,
  selectListCards,
} from "@/store/selectors/lists";
import { selectActiveList, selectMetadata } from "@/store/selectors/shared";
import { assert } from "@/utils/assert";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { Footer } from "../footer";
import { CardGrid } from "./card-grid";
import { CardGridGrouped } from "./card-grid-grouped";
import { CardList } from "./card-list";
import css from "./card-list-container.module.css";
import { CardlistCount } from "./card-list-count";
import { CardListNav } from "./card-list-nav";
import { CardSearch } from "./card-search";
import type { CardListProps } from "./types";

interface Props extends CardListProps {
  topContent?: React.ReactNode;
}

export const CardListContainer = forwardRef(function CardListContainer(
  props: Props,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, slotLeft, slotRight, targetDeck, topContent, ...rest } =
    props;

  const ctx = useResolvedDeck();

  const search = useStore(selectActiveListSearch);
  const metadata = useStore(selectMetadata);
  const data = useStore((state) =>
    selectListCards(state, ctx.resolvedDeck, targetDeck),
  );

  const setCardModalConfig = useStore((state) => state.setCardModalConfig);

  useEffect(() => {
    setCardModalConfig({ listOrder: data?.cards.map((c) => c.code) });

    return () => {
      setCardModalConfig({ listOrder: undefined });
    };
  }, [data?.cards, setCardModalConfig]);

  const list = useStore(selectActiveList);
  assert(list, "No active list found");
  const listDisplay = list.display;

  const onSelectGroup = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      const customEvent = new CustomEvent("list-select-group", {
        detail: evt.target.value,
      });
      window.dispatchEvent(customEvent);
    },
    [],
  );

  const onKeyboardNavigate = useCallback((evt: React.KeyboardEvent) => {
    if (
      evt.key === "ArrowDown" ||
      evt.key === "ArrowUp" ||
      evt.key === "Enter" ||
      evt.key === "Escape"
    ) {
      evt.preventDefault();

      const customEvent = new CustomEvent("list-keyboard-navigate", {
        detail: evt.key,
      });

      window.dispatchEvent(customEvent);

      if (evt.key === "Escape" && evt.target instanceof HTMLElement) {
        evt.target.blur();
      }
    }
  }, []);

  return (
    <CenterLayout
      className={className}
      ref={ref}
      top={
        <>
          {topContent}
          <CardSearch
            key={list?.key}
            onInputKeyDown={onKeyboardNavigate}
            slotLeft={slotLeft}
            slotRight={slotRight}
            slotFlags={<CardlistCount data={data} />}
          />
        </>
      }
    >
      <div className={css["container"]}>
        <CardListNav
          deck={ctx.resolvedDeck}
          data={data}
          metadata={metadata}
          onSelectGroup={onSelectGroup}
          viewMode={listDisplay.viewMode}
        />
        {data && (
          <>
            {listDisplay.viewMode === "scans" && (
              <CardGrid
                {...rest}
                data={data}
                listDisplay={listDisplay}
                metadata={metadata}
                resolvedDeck={ctx.resolvedDeck}
                search={search}
              />
            )}
            {listDisplay.viewMode === "scans-grouped" && (
              <CardGridGrouped
                {...rest}
                data={data}
                listDisplay={listDisplay}
                metadata={metadata}
                resolvedDeck={ctx.resolvedDeck}
                search={search}
              />
            )}
            {listDisplay.viewMode !== "scans" &&
              listDisplay.viewMode !== "scans-grouped" && (
                <CardList
                  {...rest}
                  data={data}
                  listDisplay={listDisplay}
                  metadata={metadata}
                  resolvedDeck={ctx.resolvedDeck}
                  search={search}
                />
              )}
          </>
        )}
        <Footer className={css["footer"]} />
      </div>
    </CenterLayout>
  );
});
