import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import {
  selectDeckFilterValue,
  selectDeckProperties,
  selectDeckPropertiesChanges,
} from "@/store/selectors/deck-collection";
import type {
  DeckProperties,
  DeckPropertyName,
} from "@/store/slices/deck-collection.types";
import { FilterContainer } from "../filters/primitives/filter-container";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";

type Props = {
  containerClass?: string;
};

export function DeckPropertiesFilter({ containerClass }: Props) {
  const { t } = useTranslation();

  const open = useStore((state) => state.deckCollection.open.properties);
  const properties = useStore(useShallow(selectDeckProperties));
  const changes = useStore(selectDeckPropertiesChanges);
  const values = useStore(
    (state) => selectDeckFilterValue(state, "properties") as DeckProperties,
  );

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
      title={t("filters.properties.title")}
    >
      <CheckboxGroup cols={1}>
        {Object.keys(properties).map((key) => (
          <Checkbox
            checked={values[key as DeckPropertyName] as boolean}
            data-key={key}
            id={`deck-property-${key}`}
            key={key}
            label={properties[key as DeckPropertyName]}
            onCheckedChange={(val) =>
              onPropertyChange(key as DeckPropertyName, !!val)
            }
          />
        ))}
      </CheckboxGroup>
    </FilterContainer>
  );
}
