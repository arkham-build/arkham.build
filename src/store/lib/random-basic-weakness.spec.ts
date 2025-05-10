import { getMockStore } from "@/test/get-mock-store";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { StoreApi } from "zustand";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "../selectors/shared";
import { StoreState } from "../slices";
import { Deck } from "../slices/data.types";
import { SettingsState } from "../slices/settings.types";
import { applyDeckEdits } from "./deck-edits";
import { randomBasicWeaknessForDeck } from "./random-basic-weakness";
import { resolveDeck } from "./resolve-deck";

describe("randomBasicWeaknessForDeck", () => {
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    store = await getMockStore();

    const mockState: Partial<StoreState> = {
      deckEdits: {},
      data: {
        decks: {
          foo: {
            id: "foo",
            investigator_code: "02003",
            slots: {},
          } as Deck,
        },
        history: {
          foo: [],
        },
      },
    };

    store.setState(mockState);
  });

  it("draws a basic weakness", () => {
    const state = store.getState();

    const opts = {
      metadata: state.metadata,
      settings: state.settings,
      lookupTables: selectLookupTables(state),
      sharing: state.sharing,
    };

    const weakness = randomBasicWeaknessForDeck(
      opts.metadata,
      opts.lookupTables,
      opts.settings,
      resolveDeck(
        opts,
        selectLocaleSortingCollator(state),
        state.data.decks.foo,
      ),
    );

    expect(weakness).toBeDefined();
  });

  it("respects collection setting when drawing", () => {
    store.setState({
      data: {
        decks: {
          foo: {
            id: "foo",
            investigator_code: "02003",
            slots: {
              "08130": 1,
              "08132": 1,
              "08133": 1,
            },
          } as unknown as Deck,
        },
        history: {
          foo: [],
        },
      },
      settings: {
        collection: {
          eoep: 1,
        },
      } as unknown as SettingsState,
    });

    const state = store.getState();

    const opts = {
      metadata: state.metadata,
      settings: state.settings,
      lookupTables: selectLookupTables(state),
      sharing: state.sharing,
    };

    const weakness = randomBasicWeaknessForDeck(
      opts.metadata,
      opts.lookupTables,
      opts.settings,
      resolveDeck(
        opts,
        selectLocaleSortingCollator(state),
        state.data.decks.foo,
      ),
    );

    expect(weakness).toEqual("08131");
  });

  it("respects investigator faction when drawing", () => {
    store.setState({
      data: {
        decks: {
          foo: {
            id: "foo",
            investigator_code: "02003",
            slots: {
              "09126": 1,
            },
          } as unknown as Deck,
        },
        history: {
          foo: [],
        },
      },
      settings: {
        collection: {
          tskp: 1,
        },
        showAllCards: false,
      } as unknown as SettingsState,
    });

    const state = store.getState();

    const opts = {
      metadata: state.metadata,
      settings: state.settings,
      lookupTables: selectLookupTables(state),
      sharing: state.sharing,
    };

    const weakness = randomBasicWeaknessForDeck(
      opts.metadata,
      opts.lookupTables,
      opts.settings,
      resolveDeck(
        opts,
        selectLocaleSortingCollator(state),
        state.data.decks.foo,
      ),
    );

    expect(weakness).toBeUndefined();
  });

  it("respects limited pool when drawing weakness", () => {
    store.setState({
      data: {
        decks: {
          foo: {
            id: "foo",
            investigator_code: "02003",
            slots: {},
            meta: '{"card_pool": "win"}',
          } as unknown as Deck,
        },
        history: {
          foo: [],
        },
      },
    });

    const state = store.getState();

    const opts = {
      metadata: state.metadata,
      settings: state.settings,
      lookupTables: selectLookupTables(state),
      sharing: state.sharing,
    };

    const weakness = randomBasicWeaknessForDeck(
      opts.metadata,
      opts.lookupTables,
      opts.settings,
      resolveDeck(
        opts,
        selectLocaleSortingCollator(state),
        state.data.decks.foo,
      ),
    );

    expect(weakness).toEqual("60304");

    store.setState({
      data: {
        ...state.data,
        decks: {
          foo: {
            ...state.data.decks.foo,
            slots: {
              "60304": 1,
            },
          },
        },
      },
    });

    const secondWeakness = randomBasicWeaknessForDeck(
      opts.metadata,
      opts.lookupTables,
      opts.settings,
      resolveDeck(
        opts,
        selectLocaleSortingCollator(state),
        store.getState().data.decks.foo,
      ),
    );

    expect(secondWeakness).not.toBeDefined();
  });
});
