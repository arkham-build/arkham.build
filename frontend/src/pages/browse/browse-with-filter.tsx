import { useEffect } from "react";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import type { FilterMapping } from "@/store/slices/lists.types";
import { useDocumentTitle } from "@/utils/use-document-title";

interface Props {
  filterKey: "pack" | "encounter_set";
  filterValue: FilterMapping["pack"] | FilterMapping["encounter_set"];
  listKeyPrefix: string;
  icon: React.ReactNode;
  title: string;
}

export function BrowseWithFilter(props: Props) {
  const { filterKey, filterValue, listKeyPrefix, icon, title } = props;

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  useDocumentTitle(title);

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const listKey = `${listKeyPrefix}-${filterValue.at(0)}`;

  useEffect(() => {
    addList(listKey, {
      card_type: "",
      ownership: "all",
      fan_made_content: "all",
      [filterKey]: filterValue,
    });

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, filterKey, filterValue, listKey]);

  if (!activeList || !isInitalized || !activeListId?.startsWith(listKey)) {
    return null;
  }

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar
          title={
            <>
              {icon} {title}
            </>
          }
          titleString={title}
        />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}
