import type { Card } from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useParams } from "wouter";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Filters } from "@/components/filters/filters";
import EncounterIcon from "@/components/icons/encounter-icon";
import PackIcon from "@/components/icons/pack-icon";
import { PageTitle } from "@/components/ui/page-title";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized, selectMetadata } from "@/store/selectors/shared";
import { official } from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";
import type { Filter } from "@/utils/fp";
import { BrowseWithFilter } from "./browse-with-filter";
import { type ChapterTab, SetTree } from "./set-tree";

export function Browse() {
  const { t } = useTranslation();

  const [chapterTab, setChapterTab] = useTabUrlState<ChapterTab>(
    "all",
    "chapter",
  );

  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);
  const hasFanMadeCycles = useStore((state) =>
    Object.values(selectMetadata(state).cycles).some(
      (cycle) => !official(cycle),
    ),
  );

  const activeChapterTab =
    chapterTab === "fan-made" && !hasFanMadeCycles ? "all" : chapterTab;

  const listKey = `browse-all-${activeChapterTab}`;

  const activeList = useStore((state) => state.lists[listKey]);
  const hasList = useStore((state) => !!state.lists[listKey]);
  const isInitalized = useStore(selectIsInitialized);

  useEffect(() => {
    if (!hasList) {
      addList(
        listKey,
        {
          card_type: "",
          ownership: "all",
          fan_made_content: "all",
        },
        {
          systemFilter: browseChapterSystemFilter(activeChapterTab),
        },
      );
    }

    setActiveList(listKey);
  }, [activeChapterTab, addList, hasList, listKey, setActiveList]);

  useEffect(() => {
    return () => {
      removeList("browse-all-all");
      removeList("browse-all-1");
      removeList("browse-all-2");
      removeList("browse-all-fan-made");
      setActiveList(undefined);
    };
  }, [removeList, setActiveList]);

  if (!activeList || !isInitalized) {
    return null;
  }

  return (
    <CardModalProvider>
      <PageTitle>{t("browse.title")}</PageTitle>
      <ListLayoutContextProvider>
        <ListLayout
          noFade
          filters={<Filters targetDeck={undefined} />}
          sidebar={
            <SetTree
              chapterTab={activeChapterTab}
              onChapterTabChange={setChapterTab}
            />
          }
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export function BrowsePack() {
  const { pack_code } = useParams<{ pack_code: string }>();
  const pack = useStore((state) =>
    pack_code ? selectMetadata(state).packs[pack_code] : undefined,
  );

  if (!pack_code || !pack) return null;

  return (
    <BrowseWithFilter
      filterKey="pack"
      filterValue={[pack_code]}
      listKeyPrefix="browse-pack"
      icon={<PackIcon code={pack_code} />}
      title={displayPackName(pack)}
    />
  );
}

export function BrowseCycle() {
  const { cycle_code } = useParams<{ cycle_code: string }>();
  const cycle = useStore((state) =>
    cycle_code ? selectMetadata(state).cycles[cycle_code] : undefined,
  );

  if (!cycle_code || !cycle) return null;

  return (
    <BrowseWithFilter
      filterKey="cycle"
      filterValue={[cycle_code]}
      listKeyPrefix="browse-cycle"
      icon={<PackIcon code={cycle_code} />}
      title={displayPackName(cycle)}
    />
  );
}

function browseChapterSystemFilter(chapterTab: ChapterTab): Filter {
  switch (chapterTab) {
    case "all":
      return (_card: Card) => true;

    case "1":
    case "2": {
      const chapter = Number.parseInt(chapterTab, 10);
      return (card: Card) => card.chapter === chapter;
    }

    case "fan-made":
      return (card: Card) => card.official === false;
  }
}

export function BrowseEncounterSet() {
  const { encounter_code } = useParams<{ encounter_code: string }>();
  const encounterSet = useStore((state) =>
    encounter_code
      ? selectMetadata(state).encounterSets[encounter_code]
      : undefined,
  );

  if (!encounter_code || !encounterSet) return null;

  return (
    <BrowseWithFilter
      filterKey="encounter_set"
      filterValue={[encounter_code]}
      listKeyPrefix="browse-encounter-set"
      icon={<EncounterIcon code={encounter_code} />}
      title={displayPackName(encounterSet)}
    />
  );
}

export default function BrowseRoutes() {
  return (
    <Switch>
      <Route component={Browse} path="/browse" />
      <Route component={BrowsePack} path="/browse/pack/:pack_code" />
      <Route component={BrowseCycle} path="/browse/cycle/:cycle_code" />
      <Route
        component={BrowseEncounterSet}
        path="/browse/encounter_set/:encounter_code"
      />
    </Switch>
  );
}
