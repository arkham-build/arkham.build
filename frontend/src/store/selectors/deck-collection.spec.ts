import type { Deck } from "@arkham-build/shared";
import { describe, expect, it } from "vitest";
import { selectDecksDisplayList } from "@/store/selectors/deck-collection";
import { getMockStore } from "@/test/get-mock-store";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";

describe("selectDecksDisplayList", () => {
  it("ignores unknown folder refs without crashing", async () => {
    const store = await getMockStore();

    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          deck: makeDeck({ id: "deck" }),
        },
        history: {
          deck: [],
        },
        deckFolders: {
          deck: "missing-folder",
        },
      },
    });

    const result = selectDecksDisplayList(store.getState());

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      type: "deck",
      depth: 0,
      deck: {
        id: "deck",
      },
    });
  });

  it("renders archive even when the archive folder is not stored", async () => {
    const store = await getMockStore();

    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          deck: makeDeck({ id: "deck" }),
        },
        history: {
          deck: [],
        },
        folders: {},
        deckFolders: {
          deck: ARCHIVE_FOLDER_ID,
        },
      },
      deckCollection: {
        ...store.getState().deckCollection,
        expandedFolders: {
          [ARCHIVE_FOLDER_ID]: true,
        },
      },
    });

    const result = selectDecksDisplayList(store.getState());

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      type: "folder",
      depth: 0,
      folder: {
        id: ARCHIVE_FOLDER_ID,
      },
    });
    expect(result.entries[1]).toMatchObject({
      type: "deck",
      depth: 1,
      folder: {
        id: ARCHIVE_FOLDER_ID,
      },
      deck: {
        id: "deck",
      },
    });
  });
});

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    exile_string: null,
    id: "deck-id",
    ignoreDeckLimitSlots: null,
    investigator_code: "01001",
    investigator_name: "Investigator",
    meta: "{}",
    name: "Deck",
    next_deck: null,
    previous_deck: null,
    problem: null,
    sideSlots: null,
    slots: {},
    source: null,
    taboo_id: null,
    tags: "",
    user_id: null,
    version: "1",
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
    ...overrides,
  };
}
