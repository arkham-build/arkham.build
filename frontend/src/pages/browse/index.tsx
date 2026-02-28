import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Filters } from "@/components/filters/filters";
import EncounterIcon from "@/components/icons/encounter-icon";
import PackIcon from "@/components/icons/pack-icon";
import { PageTitle } from "@/components/ui/page-title";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized, selectMetadata } from "@/store/selectors/shared";
import { displayPackName } from "@/utils/formatting";
import { BrowseWithFilter } from "./browse-with-filter";
import { SetTree } from "./set-tree";

export function Browse() {
  const { t } = useTranslation();

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const isInitalized = useStore(selectIsInitialized);
  useEffect(() => {
    const listKey = "browse-all";

    addList(listKey, {
      card_type: "",
      ownership: "all",
      fan_made_content: "all",
    });

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList]);

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
          sidebar={<SetTree />}
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
      title={encounterSet.name}
    />
  );
}
