// Currently unused, functionality preserved for 'My Decks' dedicated page.

import { useStore } from "@/store";
import { selectDeckFilterValue } from "@/store/selectors/deck-filters";
import type { DeckValidity } from "@/store/slices/deck-collection-filters.types";
import { capitalize } from "@/utils/formatting";
import { TicketCheck, TicketX, Tickets } from "lucide-react";
import { useCallback } from "react";
import { FilterContainer } from "../filters/primitives/filter-container";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "../ui/radio-button-group";

type Props = {
  containerClass?: string;
};

export function ValidityFilter({ containerClass }: Props) {
  const open = useStore((state) => state.deckFilters.open.validity);
  const value = useStore<DeckValidity>((state) =>
    selectDeckFilterValue(state, "validity"),
  );

  const setFilterValue = useStore((state) => state.addDecksFilter);
  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const resetFilter = useStore((state) => state.resetDeckFilter);

  const onReset = useCallback(() => {
    resetFilter("validity");
  }, [resetFilter]);

  const onOpenChange = useCallback(
    (val: boolean) => {
      setFilterOpen("validity", val);
    },
    [setFilterOpen],
  );

  const onChange = useCallback(
    (value: DeckValidity) => {
      setFilterValue("validity", value);
    },
    [setFilterValue],
  );

  return (
    <FilterContainer
      className={containerClass}
      filterString={value !== "all" ? capitalize(value) : undefined}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title="Validity"
    >
      <RadioButtonGroup icons onValueChange={onChange} value={value}>
        <RadioButtonGroupItem tooltip="Only valid" value="valid">
          <TicketCheck />
        </RadioButtonGroupItem>
        <RadioButtonGroupItem tooltip="Only invalid" value="invalid">
          <TicketX />
        </RadioButtonGroupItem>
        <RadioButtonGroupItem tooltip="All" value="all">
          <Tickets />
        </RadioButtonGroupItem>
      </RadioButtonGroup>
    </FilterContainer>
  );
}
