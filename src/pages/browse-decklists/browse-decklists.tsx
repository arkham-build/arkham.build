import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrowIcon, LoaderCircleIcon } from "lucide-react";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { ArkhamDBDecklistResult } from "@/components/arkhamdb-decklists/arkhamdb-decklist-result";
import { CardModalProvider } from "@/components/card-modal/card-modal-context";
import { Loader } from "@/components/ui/loader";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import {
  type SortType,
  searchDecklists,
} from "@/store/services/requests/decklist-search";
import { ApiError } from "@/store/services/requests/shared";
import type { StoreState } from "@/store/slices";
import {
  ErrorDisplay,
  ErrorImage,
} from "../../components/error-display/error-display";
import css from "./browser-decklists.module.css";
import { DecklistsFilters } from "./decklists-filters/decklists-filters";

const selectQueryFromState = createSelector(
  (state: StoreState) => state.decklistsFilters,
  (decklistsFilters) => {
    const params = {
      offset: decklistsFilters.offset,
      limit: 30,
      sortBy: decklistsFilters.sortBy,
      analyzeSideDecks: decklistsFilters.filters.analyzeSideDecks,
      authorName: decklistsFilters.filters.authorName,
      canonicalInvestigatorCode:
        decklistsFilters.filters.canonicalInvestigatorCode,
      description_length: decklistsFilters.filters.description_length,
      excludedCards: decklistsFilters.filters.excluded_cards,
      investigatorFactions: decklistsFilters.filters.investigatorFactions,
      dateRange: decklistsFilters.filters.dateRange,
      name: decklistsFilters.filters.name,
      requiredCards: decklistsFilters.filters.requiredCards,
    };

    return {
      placeholderData: keepPreviousData,
      queryFn: () => searchDecklists(params),
      queryKey: ["decklists", ...Object.values(params)],
    };
  },
);

function BrowseDecklists() {
  const { t } = useTranslation();

  const navRef = useRef<HTMLElement>(null);
  const sortBy = useStore((state) => state.decklistsFilters.sortBy);

  const setSortBy = useStore((state) => state.setDecklistsSortBy);
  const setOffset = useStore((state) => state.setDecklistsOffset);

  const query = useStore(selectQueryFromState);
  const { data, isPending, error, isPlaceholderData } = useQuery(query);

  const onOffsetChange = useCallback(
    (newOffset: number) => {
      setOffset(newOffset);
      if (window.scrollY > window.innerHeight) {
        navRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    },
    [setOffset],
  );

  return (
    <CardModalProvider>
      <AppLayout
        mainClassName={css["layout"]}
        title={t("decklists.browse.title")}
      >
        <DecklistsFilters key={JSON.stringify(query.queryKey)} />
        {data && (
          <>
            <nav className={css["content-nav"]} ref={navRef}>
              <span className={css["content-nav-count"]}>
                {isPlaceholderData ? (
                  <>
                    <LoaderCircleIcon className="spin" />
                    {t("decklists.browse.loading")}
                  </>
                ) : (
                  t("decklists.browse.results_count", {
                    count: data.meta.total,
                  })
                )}
              </span>
              <Sorting
                disabled={isPlaceholderData}
                onSortByChange={setSortBy}
                sortBy={sortBy}
              />
            </nav>
            <Pagination
              disabled={isPlaceholderData}
              total={data.meta.total}
              offset={data.meta.offset}
              limit={data.meta.limit}
              onOffsetChange={onOffsetChange}
            />
            <ol className={css["results"]}>
              {data.data.map((result) => (
                <li key={result.id}>
                  <ArkhamDBDecklistResult result={result} />
                </li>
              ))}
            </ol>
            <Pagination
              disabled={isPlaceholderData}
              total={data.meta.total}
              offset={data.meta.offset}
              limit={data.meta.limit}
              onOffsetChange={onOffsetChange}
            />
          </>
        )}
        {error && (
          <ErrorDisplay
            message={error.message}
            pre={<ErrorImage />}
            status={error instanceof ApiError ? error.status : 404}
          />
        )}
        {data?.meta.total === 0 && (
          <ErrorDisplay
            message={t("decklists.browse.no_results")}
            pre={<ErrorImage />}
            status={404}
          />
        )}
        {isPending && (
          <div className={css["loader"]}>
            <Loader show message={t("decklists.browse.loading")} />
          </div>
        )}
      </AppLayout>
    </CardModalProvider>
  );
}

function Sorting({
  disabled,
  onSortByChange,
  sortBy,
}: {
  disabled?: boolean;
  onSortByChange: (sortBy: SortType) => void;
  sortBy: SortType;
}) {
  const { t } = useTranslation();

  const options: { value: SortType; label: string }[] = [
    {
      value: "popularity",
      label: t("decklists.sorting.popularity"),
    },
    {
      value: "date",
      label: t("decklists.sorting.date"),
    },
    {
      value: "likes",
      label: t("decklists.sorting.likes"),
    },
    {
      value: "user_reputation",
      label: t("decklists.sorting.user_reputation"),
    },
  ];

  return (
    <div className={css["sorting"]}>
      <ArrowDownWideNarrowIcon />
      <Select
        disabled={disabled}
        onChange={(evt) => {
          onSortByChange(evt.target.value as SortType);
        }}
        options={options}
        required
        value={sortBy}
      />
    </div>
  );
}

export default BrowseDecklists;
