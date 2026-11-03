import { FileCheckIcon, FileIcon, FileWarningIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "../ui/radio-button-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

export function OwnershipFilter({ id }: FilterProps) {
  const { t } = useTranslation();
  const { filter, changes } = useActiveFilter(id, "ownership");

  const { onChange, onOpenChange, locked } = useFilter(id);

  return (
    <FilterContainer
      alwaysShowChanges
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.ownership.title")}
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
          tooltip={t("filters.ownership.owned")}
          value="owned"
        >
          <FileCheckIcon />
        </RadioButtonGroupItem>
        <RadioButtonGroupItem
          tooltip={t("filters.ownership.unowned")}
          value="unowned"
        >
          <FileWarningIcon />
        </RadioButtonGroupItem>
      </RadioButtonGroup>
    </FilterContainer>
  );
}
