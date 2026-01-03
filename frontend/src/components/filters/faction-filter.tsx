import { useCallback } from "react";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFactionOptions,
} from "@/store/selectors/lists";
import { isFactionFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { FactionToggle } from "../faction-toggle";
import type { FilterProps } from "./filters.types";
import { useFilter } from "./primitives/filter-hooks";

export function FactionFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;

  const filter = useStore((state) => selectActiveListFilter(state, id));
  assert(
    isFactionFilterObject(filter),
    `FactionFilter instantiated with '${filter?.type}'`,
  );

  const options = useStore((state) =>
    selectFactionOptions(state, resolvedDeck, targetDeck),
  );

  const { onChange } = useFilter(id);

  const onValueChange = useCallback(
    (value: string[]) => {
      onChange(value);
    },
    [onChange],
  );

  return (
    <FactionToggle
      options={options}
      value={filter.value}
      onValueChange={onValueChange}
    />
  );
}
