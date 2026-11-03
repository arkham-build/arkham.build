import { useTranslation } from "react-i18next";
import type { CardTypeFilter as CardTypeFilterType } from "@/store/slices/lists.types";
import { useHotkey } from "@/utils/use-hotkey";
import { HotkeyTooltip } from "../ui/hotkey";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

export function CardTypeFilter(props: FilterProps & { className?: string }) {
  const { className, id } = props;

  const { filter } = useActiveFilter(id, "card_type");

  const { t } = useTranslation();

  const { onChange, locked } = useFilter(id);

  const onToggle = (value: CardTypeFilterType) => {
    if (value === filter.value) {
      onChange("");
    } else {
      onChange(value);
    }
  };

  useHotkey("alt+p", () => onToggle("player"));
  useHotkey("alt+c", () => onToggle("encounter"));

  if (!filter) return null;

  return (
    <ToggleGroup
      className={className}
      data-testid="toggle-card-type"
      disabled={locked}
      full
      onValueChange={onToggle}
      type="single"
      value={filter.value || undefined}
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
