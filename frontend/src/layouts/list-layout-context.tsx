import { createContext, useContext } from "react";

type Context = {
  sidebarOpen: boolean;
  filtersOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const ListLayoutContext = createContext<Context>({
  sidebarOpen: false,
  filtersOpen: false,
  setSidebarOpen: () => {},
  setFiltersOpen: () => {},
});

export function useListLayoutContext() {
  const context = useContext(ListLayoutContext);
  if (!context) {
    throw new Error(
      "useListLayoutContext must be used within a ListLayoutContextProvider",
    );
  }
  return context;
}
