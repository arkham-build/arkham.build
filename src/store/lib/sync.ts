import type { StoreApi } from "zustand";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import { ApiError } from "../services/queries";
import type { StoreState } from "../slices";
import type { Provider } from "../slices/connections.types";
import type { Deck } from "../slices/data.types";
import { mapValidationToProblem } from "./deck-io";
import { validateDeck } from "./deck-validation";
import { resolveDeck } from "./resolve-deck";

interface SyncAdapter {
  in(deck: Deck): Deck;
  out(deck: Deck): Deck;
}

class ArkhamDbAdapter implements SyncAdapter {
  constructor(public state: StoreState) {}

  in(_deck: Deck): Deck {
    const deck = structuredClone(_deck);

    const lookupTables = selectLookupTables(this.state);
    const metadata = selectMetadata(this.state);

    const validation = validateDeck(
      resolveDeck(
        {
          lookupTables,
          metadata,
          sharing: this.state.sharing,
        },
        selectLocaleSortingCollator(this.state),
        deck,
      ),
      metadata,
      lookupTables,
    );

    const problem = mapValidationToProblem(validation);

    return {
      ...deck,
      problem,
      source: "arkhamdb",
    };
  }

  out(_deck: Deck) {
    const deck: Record<string, unknown> = structuredClone(_deck);
    deck.slots = JSON.stringify(deck.slots);
    deck.side = JSON.stringify(deck.sideSlots);
    deck.ignored = JSON.stringify(deck.ignoreDeckLimitSlots);
    deck.source = undefined;
    deck.version = undefined;
    deck.previous_deck = undefined;
    deck.next_deck = undefined;
    deck.taboo = deck.taboo_id;
    return deck as Deck;
  }
}

export const syncAdapters = {
  arkhamdb: ArkhamDbAdapter,
};

export function disconnectProviderIfUnauthorized(
  provider: Provider,
  err: unknown,
  set: StoreApi<StoreState>["setState"],
) {
  if (err instanceof ApiError && err.status === 401) {
    set((state) => ({
      connections: {
        ...state.connections,
        data: {
          ...state.connections.data,
          [provider]: {
            ...state.connections.data[provider],
            status: "disconnected",
          },
        },
      },
    }));
  }
}
