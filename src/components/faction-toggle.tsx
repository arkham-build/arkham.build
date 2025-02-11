import type { Faction } from "@/store/services/queries.types";
import type { MultiselectFilter } from "@/store/slices/lists.types";
import { useTranslation } from "react-i18next";
import css from "./faction-toggle.module.css";
import { FactionIconFancy } from "./icons/faction-icon-fancy";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

type Props = {
  options: Faction[];
  value: MultiselectFilter;
  onValueChange: (value: string[]) => void;
};

export function FactionToggle(props: Props) {
  const { options, value, onValueChange } = props;
  const { t } = useTranslation();

  return (
    <ToggleGroup
      className={css["toggle"]}
      data-testid="filters-faction"
      full
      icons
      onValueChange={onValueChange}
      type="multiple"
      value={value}
    >
      {options.map((faction) => (
        <ToggleGroupItem
          className={css[`color-active-${faction.code}`]}
          data-testid={`filters-faction-${faction.code}`}
          key={faction.code}
          tooltip={t(`common.factions.${faction.code}`)}
          value={faction.code}
        >
          <FactionIconFancy code={faction.code} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
