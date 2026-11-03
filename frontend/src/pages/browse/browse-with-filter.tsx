import { CardListContainer } from "@/components/card-list/card-list-container";
import { Filters } from "@/components/filters/filters";
import { PageTitle } from "@/components/ui/page-title";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { ListLayout } from "@/layouts/list-layout";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { useTemporaryList } from "@/utils/use-temporary-list";
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

  const isInitalized = useStore(selectIsInitialized);

  const listReady = useTemporaryList(
    `${listKeyPrefix}-${activeCode}`,
    {
      card_type: "",
      ownership: "all",
      fan_made_content: "all",
      [filterKey]: [activeCode],
    },
    {
      additionalFilters:
        filterKey === "cycle" ? ["illustrator", "cycle"] : ["illustrator"],
      displaySettingsKey: "browse",
      lockedFilters: new Set([filterKey]),
    },
  );

  const initialChapterTab = useStore((state) =>
    selectInitialChapterTab(state, activeCode, filterKey),
  );

  const [chapterTab, setChapterTab] = useTabUrlState<ChapterTab>(
    initialChapterTab ? (String(initialChapterTab) as ChapterTab) : "all",
    "chapter",
  );

  if (!listReady || !isInitalized) {
    return null;
  }

  return (
    <>
      <PageTitle>{title}</PageTitle>
      <ListLayout
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
        {(props) => <CardListContainer {...props} showPackQuantities />}
      </ListLayout>
    </>
  );
}
