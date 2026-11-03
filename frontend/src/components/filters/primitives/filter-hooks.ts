import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
} from "@/store/selectors/lists";
import type { FilterKey, FilterObject } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";

export function useActiveFilter<K extends FilterKey>(
  id: number,
  expectedType: K,
) {
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assertFilterType(filter, expectedType);

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  return { filter, changes };
}

function assertFilterType<K extends FilterKey>(
  filter: FilterObject<FilterKey> | undefined,
  expectedType: K,
): asserts filter is FilterObject<K> {
  assert(
    filter?.type === expectedType,
    `Expected '${expectedType}' filter, got '${filter?.type}'.`,
  );
}

export function useFilter<T>(id: number) {
  const setFilterValue = useStore((state) => state.setFilterValue);
  const setFilterOpen = useStore((state) => state.setFilterOpen);
  const resetFilter = useStore((state) => state.resetFilter);
  const locked = useStore((state) => {
    const listId = state.activeList;
    return listId
      ? (state.lists[listId]?.filterValues[id]?.locked ?? false)
      : false;
  });

  const onReset = () => {
    resetFilter(id);
  };

  const onOpenChange = (val: boolean) => {
    setFilterOpen(id, val);
  };

  const onChange = (value: T) => {
    setFilterValue(id, value);
  };

  return {
    onReset,
    onOpenChange,
    onChange,
    locked,
  };
}
