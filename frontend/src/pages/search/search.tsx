import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Redirect, useSearchParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { selectListCards } from "@/store/selectors/lists";
import { selectIsInitialized } from "@/store/selectors/shared";
import { useDocumentTitle } from "@/utils/use-document-title";

function Search() {
  const { t } = useTranslation();

  const [searchParams] = useSearchParams();

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  const title = t("search.title");
  useDocumentTitle(title);

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);
  const mounted = useRef(false);

  const listKey = "search";

  useEffect(() => {
    addList(
      listKey,
      {
        card_type: "",
      },
      {
        search: searchParams.get("q") || "",
        showInvestigatorFilter: false,
        showOwnershipFilter: false,
      },
    );

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, searchParams]);

  const listCards = useStore((state) =>
    selectListCards(state, undefined, undefined),
  );

  if (!activeList || !isInitalized || !activeListId?.startsWith(listKey)) {
    return null;
  }

  if (!mounted.current && listCards?.totalCardCount === 1) {
    return <Redirect to={`/card/${listCards.cards[0].code}`} />;
  }

  mounted.current = true;

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar title={title} titleString={title} />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export default Search;
