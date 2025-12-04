import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { selectResolvedDeckById } from "@/store/selectors/decks";
import type { StoreState } from "@/store/slices";
import deckCustomizable from "@/test/fixtures/decks/customizable.json";
import deckSpirits from "@/test/fixtures/decks/extra_slots.json";
import deckMultiFaction from "@/test/fixtures/decks/multi_faction_select.json";
import { getMockStore } from "@/test/get-mock-store";
import { DeckSchema } from "../schemas/deck.schema";
import { formatDeckAsText } from "./deck-io";
import type { ResolvedDeck } from "./types";

describe("formatDeckAsText()", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
    const state = store.getState();
    store.setState({
      ...state,
      data: {
        ...state.data,
        decks: {
          customizable: DeckSchema.parse(deckCustomizable),
          spirits: DeckSchema.parse(deckSpirits),
          multiFaction: deckMultiFaction,
        },
        history: {
          customizable: [],
          multiFaction: [],
          spirits: [],
        },
      },
    });
  });

  it("formats customizable", () => {
    const state = store.getState();
    const deck = selectResolvedDeckById(state, "customizable", false);
    const result = formatDeckAsText(store.getState(), deck as ResolvedDeck);
    expect(result).toMatchSnapshot();
  });

  it("formats the spirit deck", () => {
    const state = store.getState();
    const deck = selectResolvedDeckById(state, "spirits", false);
    const result = formatDeckAsText(store.getState(), deck as ResolvedDeck);
    expect(result).toMatchSnapshot();
  });

  it("formats multi-faction decks", () => {
    const state = store.getState();
    const deck = selectResolvedDeckById(state, "multiFaction", false);
    const result = formatDeckAsText(store.getState(), deck as ResolvedDeck);
    expect(result).toMatchSnapshot();
  });
});
