import type { StoreApi } from "zustand";
import { type Deck, DeckSchema } from "@/store/schemas/deck.schema";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectStaticBuildQlInterpreter,
} from "../selectors/shared";
import { ApiError } from "../services/requests/shared";
import type { StoreState } from "../slices";
import type { Provider } from "../slices/connections.types";
import { mapValidationToProblem } from "./deck-io";
import { validateDeck } from "./deck-validation";
import { applyHiddenSlots, extractHiddenSlots } from "./fan-made-content";
import { resolveDeck } from "./resolve-deck";

interface SyncAdapter<Output extends Record<string, unknown>> {
  in(deck: Deck): Deck;
  out(deck: Deck): Output;
}

type ArkhamDBDeckPayload = Omit<
  Deck,
  | "slots"
  | "sideSlots"
  | "ignoreDeckLimitSlots"
  | "problem"
  | "source"
  | "version"
  | "previous_deck"
  | "next_deck"
  | "taboo_id"
> & {
  slots: string;
  side: string | undefined;
  ignored: string | undefined;
  taboo: number | undefined;
};

class ArkhamDBAdapter implements SyncAdapter<ArkhamDBDeckPayload> {
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

  out(_deck: Deck) {
    const state = this.stateGetter();
    const deck = structuredClone(_deck);

    extractHiddenSlots(deck, selectMetadata(state));

    const payload = deck as Record<string, unknown>;

    payload.slots = JSON.stringify(deck.slots);
    payload.side = JSON.stringify(deck.sideSlots);
    payload.ignored = JSON.stringify(deck.ignoreDeckLimitSlots);
    payload.source = undefined;
    payload.version = undefined;
    payload.previous_deck = undefined;
    payload.next_deck = undefined;
    payload.taboo = deck.taboo_id;

    delete payload.sideSlots;
    delete payload.ignoreDeckLimitSlots;

    return payload as ArkhamDBDeckPayload;
  }
}

export const syncAdapters = {
  arkhamdb: ArkhamDBAdapter,
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
