import { ErrorDisplay } from "@/pages/errors/error-display";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { type ListState, selectListCards } from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { getRecommendations } from "@/store/services/queries";
import type {
  Card,
  Recommendation,
  Recommendations,
} from "@/store/services/queries.types";
import { deckTickToString } from "@/store/slices/recommender";
import { cx } from "@/utils/cx";
import { useResolvedColorTheme } from "@/utils/use-color-theme";
import { useQuery } from "@/utils/use-query";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { type MutableRefObject, forwardRef, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CardList } from "../card-list/card-list";
import { CardSearch } from "../card-list/card-search";
import type { CardListProps } from "../card-list/types";
import { Footer } from "../footer";
import { Loader } from "../ui/loader";
import css from "./card-recommender.module.css";
import { DeckDateRangeFilter } from "./deck-date-range-filter";
import { IncludeSideDeckToggle } from "./include-side-deck-toggle";
import { RecommendationBar } from "./recommendation-bar";
import { RecommenderRelativityToggle } from "./recommender-relativity-toggle";

export const CardRecommender = forwardRef(function CardRecommender(
  props: CardListProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { slotLeft, slotRight, ...rest } = props;

  const { t } = useTranslation();
  const { resolvedDeck } = useResolvedDeck();

  const listState = useStore((state) =>
    selectListCards(state, resolvedDeck, "slots"),
  );

  const recommender = useStore((state) => state.recommender);
  const {
    includeSideDeck,
    isRelative,
    deckFilter: dateRange,
    coreCards,
  } = recommender;

  const recommendationQuery = useMemoSubset(
    () => {
      if (!resolvedDeck?.id || !listState?.cards) {
        return () =>
          Promise.resolve({ recommendations: [], decks_analyzed: 0 });
      }
      const dateRangeStrings = dateRange.map(deckTickToString) as [
        string,
        string,
      ];
      // We don't want to recommend signatures, story cards, or weaknesses
      const toRecommend = listState.cards
        .filter((card) => card.xp != null)
        .map((card) => card.code);

      const canonicalFrontCode =
        resolvedDeck?.metaParsed.alternate_front ??
        resolvedDeck?.investigator_code;
      const canonicalBackCode =
        resolvedDeck?.metaParsed.alternate_back ??
        resolvedDeck?.investigator_code;
      const canonicalizedInvestigatorCode = `${canonicalFrontCode}-${canonicalBackCode}`;

      return () =>
        getRecommendations(
          canonicalizedInvestigatorCode,
          includeSideDeck,
          isRelative,
          coreCards[resolvedDeck.id] || [],
          toRecommend,
          dateRangeStrings,
        );
    },
    listState?.cards, //Allows the new version of listState.cards to be a subset of the old one
    [
      resolvedDeck?.id,
      resolvedDeck?.investigator_code,
      resolvedDeck?.metaParsed.alternate_back,
      resolvedDeck?.metaParsed.alternate_front,
      includeSideDeck,
      isRelative,
      dateRange,
      coreCards,
    ],
  );

  const { data, state } = useQuery(recommendationQuery);

  const onKeyboardNavigate = useCallback((evt: React.KeyboardEvent) => {
    if (
      evt.key === "ArrowDown" ||
      evt.key === "ArrowUp" ||
      evt.key === "Enter" ||
      evt.key === "Escape"
    ) {
      evt.preventDefault();

      const customEvent = new CustomEvent("list-keyboard-navigate", {
        detail: evt.key,
      });

      window.dispatchEvent(customEvent);

      if (evt.key === "Escape" && evt.target instanceof HTMLElement) {
        evt.target.blur();
      }
    }
  }, []);

  if (!listState || !resolvedDeck) return null;

  return (
    <article className={cx(css["card-recommender"])} ref={ref}>
      <div className={cx(css["container"])}>
        <div className={cx(css["toolbar"])}>
          <CardSearch
            onInputKeyDown={onKeyboardNavigate}
            mode="force-hover"
            slotLeft={slotLeft}
            slotRight={slotRight}
          />
          <DeckDateRangeFilter />
          <div className={cx(css["toggle-container"])}>
            <IncludeSideDeckToggle />
            {data && <DeckCount decks_analyzed={data?.decks_analyzed} />}
            <RecommenderRelativityToggle
              investigator={resolvedDeck.investigator_name}
            />
          </div>
        </div>
        {(state === "loading" || state === "initial") && (
          <div className={css["loader-container"]}>
            <Loader show message={t("deck_edit.recommendations.loading")} />
          </div>
        )}
        {state === "error" && (
          <ErrorDisplay
            message={t("deck_edit.recommendations.error")}
            status={500}
          />
        )}
        {data && (
          <CardRecommenderInner
            {...rest}
            data={data}
            listState={listState}
            resolvedDeck={resolvedDeck}
          />
        )}
      </div>
      <Footer />
    </article>
  );
});

function DeckCount(props: { decks_analyzed?: number }) {
  const { decks_analyzed } = props;
  const { t } = useTranslation();

  if (!decks_analyzed == null) return null;

  return (
    <span className={css["toggle-decks-count"]}>
      <i className="icon-deck" />
      {t("deck_collection.count", { count: decks_analyzed })}
    </span>
  );
}

function CardRecommenderInner(
  props: Omit<CardListProps, "slotLeft" | "slotRight"> & {
    data: Recommendations;
    listState: ListState;
    resolvedDeck: ResolvedDeck;
  },
) {
  const { data, quantities, resolvedDeck, listState, getListCardProps } = props;

  const { t } = useTranslation();
  const theme = useResolvedColorTheme();

  const metadata = useStore(selectMetadata);

  const { recommendations, decks_analyzed } = data;

  const indexedRecommendations = recommendations.reduce(
    (acc, rec) => {
      acc[rec.card_code] = rec;
      return acc;
    },
    {} as Record<string, Recommendation>,
  );

  const sortedCards = listState.cards
    .filter((card) => indexedRecommendations[card.code] !== undefined)
    .sort(
      (a, b) =>
        indexedRecommendations[b.code].ordering -
        indexedRecommendations[a.code].ordering,
    );

  const newData: ListState = {
    cards: sortedCards,
    totalCardCount: sortedCards.length,
    groups: [],
    groupCounts: [],
    key: "recommendations",
  };

  const listCardPropsWithRecommendations = useCallback(
    (card: Card) => ({
      ...getListCardProps?.(card),
      renderCardAfter: (card: Card) => (
        <RecommendationBar
          card={card}
          deckCount={decks_analyzed}
          investigator={resolvedDeck.investigator_name}
          recommendations={indexedRecommendations}
        />
      ),
    }),
    [
      getListCardProps,
      decks_analyzed,
      resolvedDeck.investigator_name,
      indexedRecommendations,
    ],
  );

  if (sortedCards.length === 0) {
    return (
      <ErrorDisplay
        message={t("deck_edit.recommendations.no_results")}
        pre={
          <img
            className={css["no-result-image"]}
            src={theme === "dark" ? "/404-dark.png" : "/404-light.png"}
            alt={t("deck_edit.recommendations.no_results")}
          />
        }
        status={404}
      />
    );
  }

  return (
    <CardList
      data={newData}
      metadata={metadata}
      resolvedDeck={resolvedDeck}
      viewMode="compact"
      listMode="single"
      quantities={quantities}
      getListCardProps={listCardPropsWithRecommendations}
    />
  );
}

// Like useMemo, but has one argument that is allowed to be a subset of previous renders
function useMemoSubset<T, S extends unknown[]>(
  fn: () => T,
  subsetDep: S | undefined,
  deps: unknown[],
): T {
  type State = {
    value: T | null;
    subset: S | undefined;
    deps: unknown[];
  };
  const state: MutableRefObject<State | null> = useRef(null);

  const needsRecompute = () => {
    if (state.current === null) {
      return true;
    }
    if (!subsetDep?.every((val) => state.current?.subset?.includes(val))) {
      return true;
    }

    if (!state.current.deps.every((val, idx) => val === deps[idx])) {
      return true;
    }
  };

  if (needsRecompute()) {
    state.current = {
      value: fn(),
      subset: subsetDep,
      deps: deps,
    };
  }

  return state.current?.value as T;
}
