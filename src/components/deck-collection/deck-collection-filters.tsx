import { useStore } from "@/store";
import {
  selectDeckFactionFilter,
  selectDeckSearchTerm,
  selectFactionsInLocalDecks,
} from "@/store/selectors/deck-filters";
import { Content, Root, Trigger } from "@radix-ui/react-collapsible";
import { FilterIcon, Minimize2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FactionToggle } from "../faction-toggle";
import { Button } from "../ui/button";
import { SearchInput } from "../ui/search-input";
import css from "./deck-collection-filters.module.css";
import { DeckSortingOptions } from "./deck-sorting-options";
import { DeckTagsFilter } from "./deck-tags-filter";

type Props = {
  filteredCount: number;
  totalCount: number;
};

export function DeckCollectionFilters(props: Props) {
  const { filteredCount, totalCount } = props;
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const addFilter = useStore((state) => state.addDecksFilter);

  const onSearchChange = (value: string) => {
    addFilter("search", value);
  };
  const searchRef = useRef<HTMLInputElement>(null);
  const searchValue = useStore(selectDeckSearchTerm);

  const factionOptions = useStore(selectFactionsInLocalDecks);
  const selectedFactions = useStore(selectDeckFactionFilter);
  const onFactionFilterChange = (value: string[]) => {
    addFilter("faction", value);
  };

  return (
    <Root
      open={open}
      onOpenChange={setOpen}
      className={css["filters-wrap"]}
      data-testid="deck-filters-container"
    >
      <div className={css["search-container"]}>
        <SearchInput
          data-testid="deck-search-input"
          id="deck-search-input"
          inputClassName={css["search-input"]}
          label={t("deck_collection.search_placeholder")}
          onChangeValue={onSearchChange}
          placeholder={t("deck_collection.search_placeholder")}
          ref={searchRef}
          value={searchValue}
          className={css["search-outer"]}
        />
        <Trigger asChild>
          <Button
            data-testid="expand-deck-filters"
            tooltip={
              open
                ? t("deck_collection.close_filters")
                : t("deck_collection.more_filters")
            }
            variant="bare"
          >
            {open ? <Minimize2Icon /> : <FilterIcon />}
          </Button>
        </Trigger>
      </div>
      <Content
        className={css["filters-container"]}
        data-testid="deck-filters-expanded"
      >
        {factionOptions.length > 1 && (
          <FactionToggle
            options={factionOptions}
            value={selectedFactions}
            onValueChange={onFactionFilterChange}
          />
        )}
        <DeckTagsFilter containerClass={css["filter"]} />
      </Content>
      <DeckSortingOptions
        filteredCount={filteredCount}
        totalCount={totalCount}
      />
    </Root>
  );
}
