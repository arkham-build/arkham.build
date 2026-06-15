import { type Deck, DeckSchema } from "@arkham-build/shared";
import type { StoreApi } from "zustand";
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

interface ProviderAdapter {
  in(deck: Deck): Deck;
}

class ArkhamDBAdapter implements ProviderAdapter {
  constructor(public stateGetter: StoreApi<StoreState>["getState"]) {}

  in(_deck: Deck): Deck {
    let state = this.stateGetter();

    const deck = DeckSchema.parse(_deck);

    state = this.stateGetter();

    const lookupTables = selectLookupTables(state);
    const metadata = selectMetadata(state);

    const validation = validateDeck(
      resolveDeck(
        {
          lookupTables,
          metadata,
        },
        selectLocaleSortingCollator(state),
        deck,
      ),
      metadata,
      lookupTables,
      selectStaticBuildQlInterpreter(state),
    );

    const problem = mapValidationToProblem(validation);

    return {
      ...deck,
      problem,
      source: "arkhamdb",
    };
  }
}

export const providerAdapters = {
  arkhamdb: ArkhamDBAdapter,
};
