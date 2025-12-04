import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrowIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "wouter";
import { ArkhamDBDecklistResult } from "@/components/arkhamdb-decklists/arkhamdb-decklist-result";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Head } from "@/components/ui/head";
import { Loader } from "@/components/ui/loader";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { AppLayout } from "@/layouts/app-layout";
import {
  type DecklistsFiltersState,
  deckSearchQuery,
  parseDeckSearchQuery,
  type SortType,
  searchDecklists,
} from "@/store/services/requests/decklists-search";
import { ApiError } from "@/store/services/requests/shared";
import {
  ErrorDisplay,
  ErrorImage,
} from "../../components/error-display/error-display";
import css from "./browser-decklists.module.css";
import { DecklistsFilters } from "./decklists-filters/decklists-filters";

function BrowseDecklists() {
  const { t } = useTranslation();

  const navRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearchParams = useRef(searchParams);

  const [state, setState] = useState(parseDeckSearchQuery(searchParams));

  useEffect(() => {
    setState(parseDeckSearchQuery(searchParams));
  }, [searchParams]);

  const { data, isPending, error, isPlaceholderData } = useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => searchDecklists(deckSearchQuery(state, 30)),
    queryKey: ["decklists", deckSearchQuery(state, 30).toString()],
  });

  const onOffsetChange = (offset: number) => {
    const nextState = { ...state, offset };
    setState(nextState);
    setSearchParams(deckSearchQuery(nextState, 30));
    if (window.scrollY > window.innerHeight) {
      navRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const onFiltersChange = (filters: DecklistsFiltersState["filters"]) => {
    const nextState = { ...state, filters, offset: 0 };
    setState(nextState);
    setSearchParams(deckSearchQuery(nextState, 30));
  };

  const onFiltersReset = () => {
    const initialState = parseDeckSearchQuery(initialSearchParams.current);
    setState(initialState);
    setSearchParams(initialSearchParams.current);
  };

  const onSortByChange = (sortBy: SortType) => {
    const nextState = { ...state, sortBy, offset: 0 };
    setState(nextState);
    setSearchParams(deckSearchQuery(nextState, 30));
  };

  return (
    <CardModalProvider>
      <AppLayout
        mainClassName={css["layout"]}
        title={t("decklists.browse.title")}
      >
        <h1>{t("decklists.browse.title")}</h1>
        {searchParams.size > 0 && (
          <Head>
            <meta name="robots" content="noindex" />
          </Head>
        )}
        <DecklistsFilters
          filters={state.filters}
          key={JSON.stringify(state.filters)}
          onFiltersChange={onFiltersChange}
          onFiltersReset={onFiltersReset}
        />
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
                onSortByChange={onSortByChange}
                sortBy={state.sortBy}
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
                  <ArkhamDBDecklistResult result={result} showDetails />
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
