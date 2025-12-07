import { CircleIcon, FilterIcon } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectDeckFactionFilter,
  selectDeckFilterChanges,
  selectDeckSearchTerm,
  selectFactionsInLocalDecks,
} from "@/store/selectors/deck-collection";
import { FactionToggle } from "../faction-toggle";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Scroller } from "../ui/scroller";
import { SearchInput } from "../ui/search-input";
import { DeckCardsFilter } from "./deck-cards-filter";
import css from "./deck-collection-filters.module.css";
import { DeckPropertiesFilter } from "./deck-properties-filter";
import { DeckProviderFilter } from "./deck-provider-filter";
import { DeckSortingOptions } from "./deck-sorting-options";
import { DeckTagsFilter } from "./deck-tags-filter";
import { DeckXPCostFilter } from "./deck-xp-cost-filter";

type Props = {
  filteredCount: number;
  totalCount: number;
};

export function DeckCollectionFilters(props: Props) {
  const { filteredCount, totalCount } = props;
  const { t } = useTranslation();

  const hasChanges = useStore(selectDeckFilterChanges);

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
    <section
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
        <Popover placement="right-start" modal>
          <PopoverTrigger asChild>
            <Button
              className={css["expand-filters"]}
              data-testid="expand-deck-filters"
              tooltip={t("deck_collection.more_filters")}
              variant="bare"
            >
              {hasChanges && <CircleIcon className={css["active"]} />}
              <FilterIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Scroller
              type="auto"
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
              <DeckCardsFilter containerClass={css["filter"]} />
              <DeckTagsFilter containerClass={css["filter"]} />
              <DeckXPCostFilter containerClass={css["filter"]} />
              <DeckProviderFilter containerClass={css["filter"]} />
              <DeckPropertiesFilter containerClass={css["filter"]} />
            </Scroller>
          </PopoverContent>
        </Popover>
      </div>
      <DeckSortingOptions
        filteredCount={filteredCount}
        totalCount={totalCount}
      />
    </section>
  );
}
