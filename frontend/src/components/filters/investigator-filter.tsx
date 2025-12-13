import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectInvestigatorOptions,
  selectListFilterProperties,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { isInvestigatorFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ListCardInner } from "../list-card/list-card-inner";
import type { Item } from "../ui/custom-select";
import css from "./filters.module.css";
import type { FilterProps } from "./filters.types";
import { CustomSelectFilter } from "./primitives/custom-select-filter";

export function InvestigatorFilter({
  id,
  resolvedDeck,
  targetDeck,
}: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const metadata = useStore(selectMetadata);

  const listFilterProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  assert(
    isInvestigatorFilterObject(filter),
    `InvestigatorFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectInvestigatorOptions(state, resolvedDeck, targetDeck),
  );

  const renderOption = useCallback(
    (item: Item | undefined) => {
      if (!item) {
        return (
          <div className={css["investigator-filter-empty"]}>
            {t("ui.combobox.unknown_option")}
          </div>
        );
      }

      if (!item.value) {
        return (
          <div className={css["investigator-filter-empty"]}>
            {t("filters.investigator.placeholder")}
          </div>
        );
      }

      const card = metadata.cards[item.value];
      if (!card) return null;

      return (
        <ListCardInner
          card={card}
          cardLevelDisplay="icon-only"
          cardShowCollectionNumber
          disableModalOpen
          omitBorders
          size="xs"
        />
      );
    },
    [t, metadata],
  );

  if (!listFilterProperties.cardTypes.has("player") && !filter.value) {
    return null;
  }

  return (
    <CustomSelectFilter
      changes={changes}
      data-testid="investigator-filter"
      id={id}
      open={filter.open}
      options={options}
      renderOption={renderOption}
      title={t("filters.investigator.title")}
      value={filter.value?.toString() ?? ""}
    />
  );
}
