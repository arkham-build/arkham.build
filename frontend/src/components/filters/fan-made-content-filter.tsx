import { featherText } from "@lucide/lab";
import { FileIcon, Icon, LibraryIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { isEmpty } from "@/utils/is-empty";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "../ui/radio-button-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

export function FanMadeContentFilter({ id }: FilterProps) {
  const { t } = useTranslation();
  const { filter, changes } = useActiveFilter(id, "fan_made_content");

  const { onChange, onOpenChange, locked } = useFilter(id);

  const showFilter = useStore((state) => {
    return (
      !isEmpty(state.ui.fanMadeContentCache?.cards) ||
      !isEmpty(state.fanMadeData.projects) ||
      filter.value !== "all"
    );
  });

  if (!showFilter) return null;

  return (
    <FilterContainer
      alwaysShowChanges
      changes={changes}
      data-testid="filter-fan-made-content"
      locked={locked}
      noChangesLabel={t("filters.fan_made_content.all")}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.fan_made_content.title")}
    >
      <RadioButtonGroup
        disabled={locked}
        icons
        onValueChange={onChange}
        value={filter.value ?? ""}
      >
        <RadioButtonGroupItem tooltip={t("filters.all")} value="all">
          <FileIcon />
        </RadioButtonGroupItem>
        <RadioButtonGroupItem
          tooltip={t("filters.fan_made_content.official")}
          value="official"
        >
          <LibraryIcon />
        </RadioButtonGroupItem>
        <RadioButtonGroupItem
          tooltip={t("filters.fan_made_content.fan_made")}
          value="fan-made"
        >
          <Icon iconNode={featherText} />
        </RadioButtonGroupItem>
      </RadioButtonGroup>
    </FilterContainer>
  );
}
