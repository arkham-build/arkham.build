import { useSyncExternalStore } from "react";

export function useMedia(query: string, defaultState = false) {
  const subscribe = (onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", onStoreChange);

    return () => {
      mediaQuery.removeEventListener("change", onStoreChange);
    };
  };

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => defaultState;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
