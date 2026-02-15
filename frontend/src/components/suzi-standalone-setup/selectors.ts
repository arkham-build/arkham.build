import type { Card } from "@arkham-build/shared";
import { createSelector, createStructuredSelector } from "reselect";
import { applyCardChanges } from "@/store/lib/card-edits";
import {
  filterCardPool,
  filterDuplicates,
  filterInvestigatorAccess,
  filterLevel,
  filterOfficial,
  filterOwnership,
} from "@/store/lib/filtering";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectCollection,
  selectLookupTables,
  selectMetadata,
  selectStaticBuildQlInterpreter,
} from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { assert } from "@/utils/assert";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { and } from "@/utils/fp";
import { isEmpty } from "@/utils/is-empty";

export const selectDependencies = createStructuredSelector({
  defaultContentType: (state: StoreState) =>
    state.settings.cardListsDefaultContentType,
  hasCollection: (state: StoreState) => !state.settings.showAllCards,
  hasFanMadeContent: (state: StoreState) =>
    !isEmpty(state.fanMadeData.projects),
  createEdit: (state: StoreState) => state.createEdit,
});

type AvailableUpgradeOptions = {
  checkOwnership: boolean;
  includeFanMade: boolean;
  ultimatumOfExile: boolean;
};

export const selectAvailableUpgrades = createSelector(
  [
    selectMetadata,
    selectLookupTables,
    selectCollection,
    selectStaticBuildQlInterpreter,
    (_: StoreState, deck: ResolvedDeck) => deck,
    (_: StoreState, __: ResolvedDeck, options: AvailableUpgradeOptions) =>
      options,
  ],
  (
    metadata,
    lookupTables,
    collection,
    buildQlInterpreter,
    deck,
    { checkOwnership, includeFanMade, ultimatumOfExile },
  ) => {
    const suzi = metadata.cards[SPECIAL_CARD_CODES.SUZI];

    const cardAccessFilter = filterInvestigatorAccess(suzi, buildQlInterpreter);
    assert(cardAccessFilter, "expected card access filter to be defined");

    const filters = [
      filterDuplicates,
      filterLevel({ range: [1, 5] }, buildQlInterpreter, suzi),
      cardAccessFilter,
      (c: Card) =>
        !c.real_text?.includes("Researched") && !c.customization_options,
    ];

    if (checkOwnership) {
      filters.push((c: Card) =>
        filterOwnership({
          card: c,
          metadata,
          lookupTables,
          collection,
          showAllCards: false,
        }),
      );
    }

    if (!includeFanMade) {
      filters.push(filterOfficial);
    }

    if (ultimatumOfExile) {
      filters.push((c: Card) => !c.real_text?.includes("Exile"));
    }

    if (deck.cardPool) {
      const cardPoolFilter = filterCardPool(
        deck.cardPool,
        metadata,
        lookupTables,
      );

      if (cardPoolFilter) {
        filters.push(cardPoolFilter);
      }
    }

    return Object.values(metadata.cards)
      .map((c) => applyCardChanges(c, metadata, deck.taboo_id, undefined))
      .filter(and(filters));
  },
);
