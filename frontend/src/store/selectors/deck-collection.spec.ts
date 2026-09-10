import { describe, expect, it } from "vitest";
import { selectDecksDisplayList } from "@/store/selectors/deck-collection";
import { makeTestDeck } from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";

describe("selectDecksDisplayList", () => {
  it("ignores unknown folder refs without crashing", async () => {
    const store = await getMockStore();

    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          deck: makeTestDeck({ id: "deck" }),
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
          deck: makeTestDeck({ id: "deck" }),
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
