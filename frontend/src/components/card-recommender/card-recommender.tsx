/** biome-ignore-all lint/style/noNonNullAssertion: checked */

import type { Card } from "@arkham-build/shared";
import {
  type Recommendation,
  RecommendationsRequestSchema,
  type RecommendationsResponse,
} from "@arkham-build/shared";
import { useQuery } from "@tanstack/react-query";
import { forwardRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ErrorDisplay,
  ErrorImage,
} from "@/components/error-display/error-display";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { type ListState, selectListCards } from "@/store/selectors/lists";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import { getRecommendations } from "@/store/services/queries";
import { ApiError } from "@/store/services/requests/shared";
import type { ListDisplay } from "@/store/slices/lists.types";
import { cx } from "@/utils/cx";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { DecklistsDateRangeInput } from "../arkhamdb-decklists/decklists-date-range-input";
import { CardList } from "../card-list/card-list";
import { CardSearch } from "../card-list/card-search";
import type { CardListProps } from "../card-list/types";
import { Footer } from "../footer";
import { Loader } from "../ui/loader";
import css from "./card-recommender.module.css";
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

  const setFilterValue = useStore((state) => state.setRecommenderDeckFilter);

  const listState = useStore((state) =>
    selectListCards(state, resolvedDeck, "slots"),
  );

  const metadata = useStore(selectMetadata);

  const recommender = useStore((state) => state.recommender);
  const {
    includeSideDeck,
    isRelative,
    deckFilter: dateRange,
    coreCards,
  } = recommender;

  const recommendationQuery = () => {
    if (!resolvedDeck?.id) {
      return Promise.resolve({ recommendations: [], decks_analyzed: 0 });
    }

    const canonicalFrontCode =
      resolvedDeck?.metaParsed.alternate_front ??
      resolvedDeck?.investigator_code;

    const canonicalBackCode =
      resolvedDeck?.metaParsed.alternate_back ??
      resolvedDeck?.investigator_code;

    const canonicalizedInvestigatorCode = `${canonicalFrontCode}-${canonicalBackCode}`;

    return getRecommendations(
      RecommendationsRequestSchema.parse({
        canonical_investigator_code: canonicalizedInvestigatorCode,
        analyze_side_decks: includeSideDeck,
        analysis_algorithm: isRelative ? "percentile_rank" : "absolute_rank",
        required_cards: coreCards[resolvedDeck.id] || [],
        date_range: dateRange,
      }),
    );
  };

  const { data, error, isPending } = useQuery({
    queryFn: recommendationQuery,
    queryKey: [
      "recommendations",
      resolvedDeck?.id,
      includeSideDeck,
      isRelative,
      coreCards[resolvedDeck?.id ?? ""],
      dateRange,
      resolvedDeck?.metaParsed.alternate_back,
      resolvedDeck?.metaParsed.alternate_front,
    ],
    retry: false,
  });

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

  const investigator = metadata.cards[resolvedDeck.investigator_code];

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
          <DecklistsDateRangeInput
            className={css["toolbar-date-range"]}
            value={dateRange}
            onValueChange={setFilterValue}
          />
          <div className={cx(css["toggle-container"])}>
            <IncludeSideDeckToggle />
            {data && <DeckCount decksAnalyzed={data?.decks_analyzed} />}
            <RecommenderRelativityToggle investigator={investigator} />
          </div>
        </div>
        {isPending && (
          <div className={css["loader-container"]}>
            <Loader show message={t("deck_edit.recommendations.loading")} />
          </div>
        )}
        {error && (
          <ErrorDisplay
            message={t("deck_edit.recommendations.error")}
            status={error instanceof ApiError ? error.status : 500}
          />
        )}
        {data && (
          <CardRecommenderInner
            {...rest}
            data={data}
            investigator={investigator}
            isRelative={isRelative}
            listState={listState}
            resolvedDeck={resolvedDeck}
          />
        )}
      </div>
      <Footer />
    </article>
  );
});

function DeckCount(props: { decksAnalyzed?: number }) {
  const { decksAnalyzed } = props;
  const { t } = useTranslation();

  if (!decksAnalyzed == null) return null;

  return (
    <span className={css["toggle-decks-count"]}>
      <i className="icon-deck" />
      {t("deck_collection.count", { count: decksAnalyzed })}
    </span>
  );
}

function CardRecommenderInner(
  props: Omit<CardListProps, "slotLeft" | "slotRight"> & {
    data: RecommendationsResponse["data"]["recommendations"];
    listState: ListState;
    resolvedDeck: ResolvedDeck;
    investigator: Card;
    isRelative: boolean;
  },
) {
  const {
    data,
    investigator,
    isRelative,
    quantities,
    resolvedDeck,
    listState,
    getListCardProps,
  } = props;

  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);

  const listDisplay = useMemo(
    () =>
      ({
        sorting: [],
        grouping: [],
        viewMode: "compact",
      }) as ListDisplay,
    [],
  );

  const { recommendations, decks_analyzed } = data;

  const indexedRecommendations = recommendations.reduce(
    (acc, rec) => {
      acc[rec.card_code] = rec;
      return acc;
    },
    {} as Record<string, Recommendation>,
  );

  const idMappings = new Map<string, string>();
  const sortedCards: Card[] = [];

  for (const card of listState.cards) {
    if (card.xp == null) continue;

    const match = [
      card.code,
      ...Object.keys(lookupTables.relations.duplicates[card.code] ?? {}),
      ...Object.keys(lookupTables.relations.reprints[card.code] ?? {}),
    ].find((code) => indexedRecommendations[code]?.recommendation > 0);

    if (match) {
      idMappings.set(card.code, match);
      sortedCards.push(card);
    }
  }

  sortedCards.sort((a, b) => {
    const aScore =
      indexedRecommendations[idMappings.get(a.code)!]?.recommendation ?? 0;
    const bScore =
      indexedRecommendations[idMappings.get(b.code)!]?.recommendation ?? 0;
    return bScore - aScore;
  });

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
          data={indexedRecommendations[idMappings.get(card.code)!]}
          decksAnalyzed={decks_analyzed}
          isRelative={isRelative}
          investigator={investigator}
        />
      ),
    }),
    [
      getListCardProps,
      decks_analyzed,
      investigator,
      indexedRecommendations,
      isRelative,
      idMappings,
    ],
  );

  if (sortedCards.length === 0) {
    return (
      <ErrorDisplay
        message={t("deck_edit.recommendations.no_results")}
        pre={<ErrorImage />}
        status={404}
      />
    );
  }

  return (
    <CardList
      data={newData}
      metadata={metadata}
      resolvedDeck={resolvedDeck}
      listDisplay={listDisplay}
      listMode="single"
      quantities={quantities}
      getListCardProps={listCardPropsWithRecommendations}
    />
  );
}
