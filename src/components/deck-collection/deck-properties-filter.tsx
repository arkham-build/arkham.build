// Currently unused, functionality preserved for 'My Decks' dedicated page.

import { useCallback } from "react";
import { useStore } from "@/store";
import {
  selectDeckFilterValue,
  selectPropertiesChanges,
} from "@/store/selectors/deck-filters";
import type { DeckPropertyName } from "@/store/slices/deck-collection-filters.types";
import { FilterContainer } from "../filters/primitives/filter-container";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";

type Props = {
  containerClass?: string;
};

const DeckPropKeyValues: Record<DeckPropertyName, string> = {
  parallel: "Parallel",
};

export function DeckPropertiesFilter({ containerClass }: Props) {
  const changes = useStore(selectPropertiesChanges);
  const values = useStore((state) =>
    selectDeckFilterValue(state, "properties"),
  );
  const open = useStore((state) => state.deckFilters.open.properties);

  const setFilterValue = useStore((state) => state.addDecksFilter);
  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const resetFilter = useStore((state) => state.resetDeckFilter);

  const onReset = useCallback(() => {
    resetFilter("properties");
  }, [resetFilter]);

  const onOpenChange = useCallback(
    (val: boolean) => {
      setFilterOpen("properties", val);
    },
    [setFilterOpen],
  );

  const onPropertyChange = useCallback(
    (property: DeckPropertyName, value: boolean) => {
      setFilterValue("properties", { ...values, [property]: value });
    },
    [setFilterValue, values],
  );

  return (
    <FilterContainer
      className={containerClass}
      changes={changes}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title="Properties"
    >
      <CheckboxGroup cols={2}>
        {Object.keys(DeckPropKeyValues).map((key) => (
          <Checkbox
            checked={values[key as DeckPropertyName]}
            data-key={key}
            id={`deck-property-${key}`}
            key={key}
            label={DeckPropKeyValues[key as DeckPropertyName]}
            onCheckedChange={(val) =>
              onPropertyChange(key as DeckPropertyName, !!val)
            }
          />
        ))}
      </CheckboxGroup>
    </FilterContainer>
  );
}
