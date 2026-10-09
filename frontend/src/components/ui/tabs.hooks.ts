import { useState } from "react";

export function useTabUrlState<T extends string>(
  defaultValue: T,
  queryKey = "tab",
) {
  const [tab, setTab] = useState<string>(
    () =>
      new URL(window.location.href).searchParams.get(queryKey) ?? defaultValue,
  );

  const onTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(queryKey, value);
    window.history.replaceState({}, "", url.toString());
    setTab(value);
  };

  return [tab as T, onTabChange] as const;
}
