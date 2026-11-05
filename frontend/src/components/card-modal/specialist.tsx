import type { Card } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { useStore } from "@/store";
import {
  filterInvestigatorAccess,
  filterPreviews,
} from "@/store/lib/filtering";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedCard } from "@/store/lib/types";
import { selectUsableByInvestigators } from "@/store/selectors/card-view";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectRelationsContentFilter,
  selectStaticBuildQlInterpreter,
} from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { isSpecialist } from "@/utils/card-utils";
import { formatRelationTitle } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { CardSet } from "../cardset";

type Props = {
  card: Card;
  investigatorFront?: Card;
};

const selectSpecialistAccess = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.settings,
  selectLocaleSortingCollator,
  selectRelationsContentFilter,
  selectStaticBuildQlInterpreter,
  (_: StoreState, card: Card) => card,
  (_: StoreState, _card: Card, investigatorFront?: Card) => investigatorFront,
  (
    metadata,
    lookupTables,
    settings,
    collator,
    contentFilter,
    buildQlInterpreter,
    investigatorBack,
    investigatorFront,
  ) => {
    const investigatorFilter = filterInvestigatorAccess(
      investigatorBack,
      buildQlInterpreter,
      lookupTables,
      {
        customizable: {
          properties: "all",
          level: "all",
        },
        investigatorFront,
      },
    );

    return Object.values(metadata.cards)
      .filter((card) => {
        const previewsAllowed = settings.showPreviews || !filterPreviews(card);

        return (
          isSpecialist(card) &&
          investigatorFilter?.(card) &&
          previewsAllowed &&
          contentFilter(card)
        );
      })
      .sort(makeSortFunction(["name", "level"], metadata, collator))
      .map((card) => ({ card }) as ResolvedCard);
  },
);

export function SpecialistAccess(props: Props) {
  const { card, investigatorFront } = props;

  const specialistAccess = useStore((state) =>
    selectSpecialistAccess(state, card, investigatorFront),
  );

  if (isEmpty(specialistAccess)) return null;

  return (
    <CardSet
      set={{
        title: formatRelationTitle("specialist"),
        cards: specialistAccess,
        id: "specialist",
        selected: false,
        quantities: undefined,
      }}
    />
  );
}

const selectUsableByInvestigatorsResolved = createSelector(
  selectUsableByInvestigators,
  selectRelationsContentFilter,
  (cards, contentFilter) => cards.filter(({ card }) => contentFilter(card)),
);

export function SpecialistInvestigators(props: Props) {
  const { card } = props;

  const investigators = useStore((state) =>
    selectUsableByInvestigatorsResolved(state, card),
  );

  if (isEmpty(investigators)) return null;

  return (
    <CardSet
      set={{
        title: formatRelationTitle("specialist_investigators"),
        cards: investigators,
        id: "specialist_investigators",
        selected: false,
        quantities: undefined,
      }}
    />
  );
}
