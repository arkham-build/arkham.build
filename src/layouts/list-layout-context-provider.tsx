import { useMemo, useState } from "react";
import { MQ_FLOATING_FILTERS, MQ_FLOATING_SIDEBAR } from "@/utils/constants";
import { ListLayoutContext } from "./list-layout-context";

export function ListLayoutContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(
    !window.matchMedia(MQ_FLOATING_SIDEBAR).matches,
  );

  const [filtersOpen, setFiltersOpen] = useState(
    !window.matchMedia(MQ_FLOATING_FILTERS).matches,
  );

  const contextValue = useMemo(
    () => ({
      sidebarOpen,
      filtersOpen,
      setSidebarOpen,
      setFiltersOpen,
    }),
    [sidebarOpen, filtersOpen],
  );

  return (
    <ListLayoutContext.Provider value={contextValue}>
      {children}
    </ListLayoutContext.Provider>
  );
}
