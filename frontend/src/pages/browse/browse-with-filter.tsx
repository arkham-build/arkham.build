import { useEffect } from "react";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { Filters } from "@/components/filters/filters";
import { PageTitle } from "@/components/ui/page-title";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { ListLayout } from "@/layouts/list-layout";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import type { FilterKey } from "@/store/slices/lists.types";
import { type ChapterTab, SetTree } from "./set-tree";
import { selectInitialChapterTab } from "./set-tree.lib";

interface Props {
  filterKey: "pack" | "encounter_set" | "cycle";
  filterCode: string;
  listKeyPrefix: string;
  icon: React.ReactNode;
  title: string;
}

export function BrowseWithFilter(props: Props) {
  const { filterCode: activeCode, filterKey, listKeyPrefix, title } = props;

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  const listKey = `${listKeyPrefix}-${activeCode}`;

  const activeList = useStore((state) => state.lists[listKey]);
  const hasList = useStore((state) => !!state.lists[listKey]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const initialChapterTab = useStore((state) =>
    selectInitialChapterTab(state, activeCode, filterKey),
  );

  const [chapterTab, setChapterTab] = useTabUrlState<ChapterTab>(
    initialChapterTab ? (String(initialChapterTab) as ChapterTab) : "all",
    "chapter",
  );

  useEffect(() => {
    const additionalFilters: FilterKey[] =
      filterKey === "cycle" ? ["illustrator", "cycle"] : ["illustrator"];

    if (!hasList) {
      addList(
        listKey,
        {
          card_type: "",
          ownership: "all",
          fan_made_content: "all",
          [filterKey]: [activeCode],
        },
        {
          additionalFilters,
          displaySettingsKey: "browse",
          lockedFilters: new Set([filterKey]),
        },
      );
    }

    setActiveList(listKey);
  }, [activeCode, addList, filterKey, hasList, listKey, setActiveList]);

  useEffect(() => {
    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [listKey, removeList, setActiveList]);

  if (!activeList || !isInitalized || !activeListId?.startsWith(listKey)) {
    return null;
  }

  return (
    <>
      <PageTitle>{title}</PageTitle>
      <ListLayout
        noFade
        filters={<Filters targetDeck={undefined} />}
        sidebar={
          <SetTree
            activeCode={activeCode}
            activeType={filterKey}
            chapterTab={chapterTab}
            onChapterTabChange={setChapterTab}
          />
        }
        sidebarWidthMax="var(--sidebar-width-one-col)"
      >
        {(props) => <CardListContainer {...props} />}
      </ListLayout>
    </>
  );
}
