import { CenterLayout } from "@/layouts/center-layout";
import { useStore } from "@/store";
import {
  selectActiveList,
  selectActiveListSearch,
  selectListCards,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { forwardRef, useCallback } from "react";
import { Footer } from "../footer";
import { CardGrid } from "./card-grid";
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

  const viewMode = useStore(
    (state) => selectActiveList(state)?.display?.viewMode ?? "compact",
  );
  const setListViewMode = useStore((state) => state.setListViewMode);

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
          onViewModeChange={setListViewMode}
          viewMode={viewMode}
        />
        {data &&
          (viewMode === "scans" ? (
            <CardGrid
              {...rest}
              data={data}
              metadata={metadata}
              search={search}
              resolvedDeck={ctx.resolvedDeck}
              viewMode={viewMode}
            />
          ) : (
            <CardList
              {...rest}
              data={data}
              metadata={metadata}
              search={search}
              resolvedDeck={ctx.resolvedDeck}
              viewMode={viewMode}
            />
          ))}
        <Footer className={css["footer"]} />
      </div>
    </CenterLayout>
  );
});
