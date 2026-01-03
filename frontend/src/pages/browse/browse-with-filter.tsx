import { useEffect } from "react";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Filters } from "@/components/filters/filters";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import type { FilterKey, FilterMapping } from "@/store/slices/lists.types";
import { useDocumentTitle } from "@/utils/use-document-title";
import { SetTree } from "./set-tree";

interface Props {
  filterKey: "pack" | "encounter_set" | "cycle";
  filterValue:
    | FilterMapping["pack"]
    | FilterMapping["encounter_set"]
    | FilterMapping["cycle"];
  listKeyPrefix: string;
  icon: React.ReactNode;
  title: string;
}

export function BrowseWithFilter(props: Props) {
  const { filterKey, filterValue, listKeyPrefix, title } = props;

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  useDocumentTitle(title);

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const activeCode = filterValue.at(0);

  const listKey = `${listKeyPrefix}-${activeCode}`;

  useEffect(() => {
    const additionalFilters: FilterKey[] =
      filterKey === "cycle" ? ["illustrator", "cycle"] : ["illustrator"];

    addList(
      listKey,
      {
        card_type: "",
        ownership: "all",
        fan_made_content: "all",
        [filterKey]: filterValue,
      },
      {
        additionalFilters,
        lockedFilters: new Set([filterKey]),
      },
    );

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
        <ListLayout
          noFade
          filters={<Filters targetDeck={undefined} />}
          sidebar={<SetTree activeCode={activeCode} activeType={filterKey} />}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}
