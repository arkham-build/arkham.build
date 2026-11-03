import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import type { ListsSlice } from "@/store/slices/lists.types";

type AddListArgs = Parameters<ListsSlice["addList"]>;

export function useTemporaryList(
  key: string,
  initialValues: AddListArgs[1],
  opts?: AddListArgs[2],
  refreshKey?: unknown,
) {
  const addList = useStore((state) => state.addList);
  const removeList = useStore((state) => state.removeList);
  const setActiveList = useStore((state) => state.setActiveList);

  const listExists = useStore((state) => state.lists[key] != null);
  const isReady = useStore(
    (state) => state.activeList === key && state.lists[key] != null,
  );

  const args = useRef({ initialValues, opts });

  useEffect(() => {
    args.current = { initialValues, opts };
  });

  useEffect(() => {
    addList(key, args.current.initialValues, args.current.opts);
    setActiveList(key);
  }, [addList, key, refreshKey, setActiveList]);

  // Lists can be removed externally, e.g. when `applySettings()` resets them.
  useEffect(() => {
    if (listExists || useStore.getState().lists[key]) return;
    addList(key, args.current.initialValues, args.current.opts);
    setActiveList(key);
  }, [addList, key, listExists, setActiveList]);

  useEffect(() => {
    return () => {
      removeList(key);
      setActiveList(undefined);
    };
  }, [key, removeList, setActiveList]);

  return isReady;
}
