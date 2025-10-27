import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectDeckFilterValue,
  selectProviderChanges,
} from "@/store/selectors/deck-collection";
import { STORAGE_PROVIDERS, type StorageProvider } from "@/utils/constants";
import { providerTagRenderer } from "../deck-tags/deck-tags";
import { FilterContainer } from "../filters/primitives/filter-container";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type Props = {
  containerClass?: string;
};

export function DeckProviderFilter(props: Props) {
  const { containerClass } = props;
  const { t } = useTranslation();

  const changes = useStore(selectProviderChanges);
  const options = Array.from(STORAGE_PROVIDERS);
  const open = useStore((state) => state.deckCollection.open.provider);
  const value = useStore((state) => selectDeckFilterValue(state, "provider"));

  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const setFilterValue = useStore((state) => state.addDecksFilter);

  const onOpenChange = useCallback(
    (val: boolean) => {
      setFilterOpen("provider", val);
    },
    [setFilterOpen],
  );

  const onChange = useCallback(
    (value: StorageProvider[]) => {
      setFilterValue("provider", value);
    },
    [setFilterValue],
  );

  return (
    <FilterContainer
      changes={changes}
      className={containerClass}
      open={open}
      onOpenChange={onOpenChange}
      title={t("deck_edit.config.storage_provider.title")}
    >
      <ToggleGroup
        type="multiple"
        onValueChange={onChange}
        value={value as string[]}
      >
        {options.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {providerTagRenderer(value, t)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FilterContainer>
  );
}
