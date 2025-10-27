import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckCollection } from "@/components/deck-collection/deck-collection";
import { Filters } from "@/components/filters/filters";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { useDocumentTitle } from "@/utils/use-document-title";

function Browse() {
  const { t } = useTranslation();

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);
  useDocumentTitle(t("browse.title"));

  const setActiveList = useStore((state) => state.setActiveList);

  useEffect(() => {
    setActiveList("browse");
  }, [setActiveList]);

  if (!isInitalized || !activeListId?.startsWith("browse")) return null;

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayout
          filters={<Filters targetDeck={undefined} />}
          sidebar={<DeckCollection />}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export default Browse;
