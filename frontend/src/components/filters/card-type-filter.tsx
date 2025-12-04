import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectActiveListFilter } from "@/store/selectors/lists";
import { isCardTypeFilterObject } from "@/store/slices/lists.type-guards";
import type { CardTypeFilter as CardTypeFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { useHotkey } from "@/utils/use-hotkey";
import { HotkeyTooltip } from "../ui/hotkey";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function CardTypeFilter(props: FilterProps & { className?: string }) {
  const { className, id } = props;

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCardTypeFilterObject(filter),
    `CardTypeFilter instantiated with '${filter?.type}'`,
  );

  const { t } = useTranslation();

  const { onChange } = useFilterCallbacks(id);

  const onToggle = useCallback(
    (value: CardTypeFilterType) => {
      if (value === filter.value) {
        onChange("");
      } else {
        onChange(value);
      }
    },
    [onChange, filter.value],
  );

  useHotkey("alt+p", () => onToggle("player"));
  useHotkey("alt+c", () => onToggle("encounter"));

  if (!filter) return null;

  return (
    <ToggleGroup
      className={className}
      defaultValue=""
      data-testid="toggle-card-type"
      full
      onValueChange={onChange}
      type="single"
      value={filter.value}
    >
      <HotkeyTooltip keybind="alt+p" description={t("common.player_cards")}>
        <ToggleGroupItem data-testid="card-type-player" value="player">
          <i className="icon-per_investigator" />{" "}
          {t("common.player_cards_short")}
        </ToggleGroupItem>
      </HotkeyTooltip>
      <HotkeyTooltip keybind="alt+c" description={t("common.encounter_cards")}>
        <ToggleGroupItem value="encounter" data-testid="card-type-encounter">
          <i className="icon-auto_fail" /> {t("common.encounter_cards_short")}
        </ToggleGroupItem>
      </HotkeyTooltip>
    </ToggleGroup>
  );
}
