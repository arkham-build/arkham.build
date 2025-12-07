import { FileCheckIcon, FileIcon, FileWarningIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isOwnershipFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "../ui/radio-button-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function OwnershipFilter({ id }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));
  assert(isOwnershipFilterObject(filter), "filter must be an ownership filter");

  const { onChange, onOpenChange } = useFilterCallbacks(id);

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  return (
    <FilterContainer
      alwaysShowChanges
      changes={changes}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.ownership.title")}
    >
      <RadioButtonGroup
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
