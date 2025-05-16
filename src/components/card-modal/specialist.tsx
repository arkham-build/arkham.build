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
  selectMetadata,
} from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import type { StoreState } from "@/store/slices";
import { isSpecialist } from "@/utils/card-utils";
import { formatRelationTitle } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { createSelector } from "reselect";
import { CardSet } from "../cardset";

type Props = {
  card: Card;
};

const selectSpecialistAccess = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  selectLocaleSortingCollator,
  (_: StoreState, card: Card) => card,
  (metadata, settings, collator, investigatorBack) => {
    const investigatorFilter = filterInvestigatorAccess(investigatorBack, {
      customizable: {
        properties: "all",
        level: "all",
      },
    });

    return Object.values(metadata.cards)
      .filter((card) => {
        const allowDisplay = settings.showPreviews || !filterPreviews(card);
        return isSpecialist(card) && investigatorFilter?.(card) && allowDisplay;
      })
      .sort(makeSortFunction(["name", "level"], metadata, collator))
      .map((card) => ({ card }) as ResolvedCard);
  },
);

export function SpecialistAccess(props: Props) {
  const { card } = props;

  const specialistAccess = useStore((state) =>
    selectSpecialistAccess(state, card),
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
  (cards) => cards.map((card) => ({ card }) as ResolvedCard),
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
