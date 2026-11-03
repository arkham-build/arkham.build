import { useStore } from "@/store";
import { selectFactionOptions } from "@/store/selectors/lists";
import { FactionToggle } from "../faction-toggle";
import type { FilterProps } from "./filters.types";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

export function FactionFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;

  const { filter } = useActiveFilter(id, "faction");

  const options = useStore((state) =>
    selectFactionOptions(state, resolvedDeck, targetDeck),
  );

  const { onChange } = useFilter(id);

  const onValueChange = (value: string[]) => {
    onChange(value);
  };

  return (
    <FactionToggle
      options={options}
      value={filter.value}
      onValueChange={onValueChange}
    />
  );
}
