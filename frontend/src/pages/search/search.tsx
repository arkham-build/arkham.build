import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Redirect, useSearchParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { parseSearchFlags } from "@/store/lib/search-url";
import { selectListCards } from "@/store/selectors/lists";
import { selectIsInitialized } from "@/store/selectors/shared";

function Search() {
  const { t } = useTranslation();

  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const cardTypeParam = searchParams.get("card_type");
  const { includeBacks, includeFlavor, includeGameText, includeName } =
    parseSearchFlags(searchParams);

  const cardType =
    cardTypeParam === "player" || cardTypeParam === "encounter"
      ? cardTypeParam
      : "";

  const listKey = "search";

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  const title = t("search.title");

  const activeList = useStore((state) => state.lists[listKey]);
  const hasActiveList = useStore((state) => !!state.lists[listKey]);

  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const setSearchFlag = useStore((state) => state.setSearchFlag);
  const setSearchValue = useStore((state) => state.setSearchValue);
  const removeList = useStore((state) => state.removeList);
  const mounted = useRef(false);
  const syncedCardType = useRef(cardType);

  useEffect(() => {
    if (!hasActiveList || syncedCardType.current !== cardType) {
      addList(
        listKey,
        {
          card_type: cardType,
        },
        {
          search: "",
          showInvestigatorFilter: false,
          showOwnershipFilter: false,
        },
      );
      syncedCardType.current = cardType;
    }

    setActiveList(listKey);
    // TODO: should be optimized into a single state update.
    setSearchFlag("includeName", includeName);
    setSearchFlag("includeGameText", includeGameText);
    setSearchFlag("includeFlavor", includeFlavor);
    setSearchFlag("includeBacks", includeBacks);
    setSearchValue(query);
  }, [
    addList,
    cardType,
    hasActiveList,
    includeBacks,
    includeFlavor,
    includeGameText,
    includeName,
    query,
    setActiveList,
    setSearchFlag,
    setSearchValue,
  ]);

  useEffect(() => {
    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [removeList, setActiveList]);

  const listCards = useStore((state) =>
    selectListCards(state, undefined, undefined),
  );

  if (!activeList || !isInitalized || !activeListId?.startsWith(listKey)) {
    return null;
  }

  if (!mounted.current && listCards?.cards.length === 1) {
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
