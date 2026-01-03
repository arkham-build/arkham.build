import { useCallback } from "react";
import { useStore } from "@/store";

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

  const onReset = useCallback(() => {
    resetFilter(id);
  }, [resetFilter, id]);

  const onOpenChange = useCallback(
    (val: boolean) => {
      setFilterOpen(id, val);
    },
    [setFilterOpen, id],
  );

  const onChange = useCallback(
    (value: T) => {
      setFilterValue(id, value);
    },
    [id, setFilterValue],
  );

  return {
    onReset,
    onOpenChange,
    onChange,
    locked,
  };
}
