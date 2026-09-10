import type { Deck } from "@arkham-build/shared";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectStaticBuildQlInterpreter,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import { mapValidationToProblem } from "./deck-io";
import { validateDeck } from "./deck-validation";
import { resolveDeck } from "./resolve-deck";

export function normalizeArkhamDbDeck(deck: Deck, state: StoreState): Deck {
  const lookupTables = selectLookupTables(state);
  const metadata = selectMetadata(state);
  const resolved = resolveDeck(
    {
      lookupTables,
      metadata,
    },
    selectLocaleSortingCollator(state),
    deck,
  );
  const validation = validateDeck(
    resolved,
    metadata,
    lookupTables,
    selectStaticBuildQlInterpreter(state),
  );

  return {
    ...deck,
    problem: mapValidationToProblem(validation),
    source: "arkhamdb",
  };
}
