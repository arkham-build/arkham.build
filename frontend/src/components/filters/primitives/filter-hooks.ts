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
