import type { StoreApi } from "zustand";
import { type Deck, DeckSchema } from "@/store/schemas/deck.schema";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectStaticBuildQlInterpreter,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import { mapValidationToProblem } from "./deck-io";
import { validateDeck } from "./deck-validation";
import { applyHiddenSlots } from "./fan-made-content";
import { resolveDeck } from "./resolve-deck";

interface ProviderAdapter {
  in(deck: Deck): Deck;
}

class ArkhamDBAdapter implements ProviderAdapter {
  constructor(public stateGetter: StoreApi<StoreState>["getState"]) {}

  in(_deck: Deck): Deck {
    let state = this.stateGetter();

    const deck = DeckSchema.parse(_deck);
    applyHiddenSlots(deck, selectMetadata(state));

    state = this.stateGetter();

    const lookupTables = selectLookupTables(state);
    const metadata = selectMetadata(state);

    const validation = validateDeck(
      resolveDeck(
        {
          lookupTables,
          metadata,
          sharing: state.sharing,
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
