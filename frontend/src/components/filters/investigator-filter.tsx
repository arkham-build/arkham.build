import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectInvestigatorOptions,
  selectListFilterProperties,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { ListCardInner } from "../list-card/list-card-inner";
import type { Item } from "../ui/custom-select";
import css from "./filters.module.css";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { CustomSelectFilter } from "./primitives/custom-select-filter";

export function InvestigatorFilter({
  id,
  resolvedDeck,
  targetDeck,
}: FilterProps) {
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "investigator");

  const metadata = useStore(selectMetadata);

  const listFilterProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  const options = useStore((state) =>
    selectInvestigatorOptions(state, resolvedDeck, targetDeck),
  );

  const renderOption = (item: Item | undefined) => {
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
  };

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
