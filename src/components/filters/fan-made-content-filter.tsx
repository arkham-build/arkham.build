import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isFanMadeContentFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { isEmpty } from "@/utils/is-empty";
import { featherText } from "@lucide/lab";
import { FileIcon, Icon, LibraryIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "../ui/radio-button-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function FanMadeContentFilter({ id }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isFanMadeContentFilterObject(filter),
    "filter must be a fan-made-content filter",
  );

  const { onChange, onOpenChange } = useFilterCallbacks(id);

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const showFilter = useStore((state) => {
    return !isEmpty(state.fanMadeData.projects) || filter.value !== "all";
  });

  if (!showFilter) return null;

  return (
    <FilterContainer
      alwaysShowChanges
      changes={changes}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.fan_made_content.title")}
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
