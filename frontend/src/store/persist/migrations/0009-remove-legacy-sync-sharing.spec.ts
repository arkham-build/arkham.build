import { describe, expect, it } from "vitest";
import { makeData, makeTestDeck } from "@/test/factories";
import migrate, { type LegacyState } from "./0009-remove-legacy-sync-sharing";

describe("v10 legacy sync and sharing migration", () => {
  it("removes legacy arkhamdb decks and preserves folder assignments", () => {
    const state: LegacyState = {
      connections: { data: { arkhamdb: {} } },
      remoting: { arkhamdb: false },
      data: makeData({
        decks: {
          local: makeTestDeck({ id: "local", source: "local" }),
          remote: makeTestDeck({ id: "remote", source: "arkhamdb" }),
        },
        deckFolders: {
          local: "folder",
          remote: "folder",
        },
        history: {
          local: [],
          remote: [],
        },
        undoHistory: {
          remote: [],
        },
      }),
      deckEdits: {
        remote: {},
      },
      sharing: {
        decks: {
          remote: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    migrate(state, 9);

    expect(state.data?.decks.remote).toBeUndefined();
    expect(state.data?.decks.local).toBeDefined();
    expect(state.data?.deckFolders).toEqual({
      local: "folder",
      remote: "folder",
    });
    expect(state.data?.undoHistory?.remote).toBeUndefined();
    expect(state.deckEdits?.remote).toBeUndefined();
    expect(state).not.toHaveProperty("connections");
    expect(state).not.toHaveProperty("remoting");
    expect(state).not.toHaveProperty("sharing");
    expect(state.settings?.flags?.migrationNeeded).toBe(true);
  });

  it("makes shared decks local and preserves their folder assignments", () => {
    const state: LegacyState = {
      data: makeData({
        decks: {
          marker: makeTestDeck({ id: "marker", source: "local" }),
          shared: makeTestDeck({ id: "shared", source: "shared" }),
          remote: makeTestDeck({ id: "remote", source: "arkhamdb" }),
        },
        deckFolders: {
          marker: "folder",
          shared: "folder",
          remote: "folder",
        },
        history: {
          marker: [],
          shared: [],
          remote: [],
        },
      }),
      deckEdits: {},
      sharing: {
        decks: {
          marker: "2026-01-01T00:00:00.000Z",
          remote: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    migrate(state, 9);

    expect(state.data?.decks.marker?.source).toBe("local");
    expect(state.data?.decks.shared?.source).toBe("local");
    expect(state.data?.decks.remote).toBeUndefined();
    expect(state.data?.deckFolders).toEqual({
      marker: "folder",
      shared: "folder",
      remote: "folder",
    });
    expect(state).not.toHaveProperty("sharing");
    expect(state.settings?.flags?.migrationNeeded).toBe(true);
  });

  it("requires account migration for legacy shared deck markers", () => {
    const state: LegacyState = {
      data: makeData({
        decks: {
          local: makeTestDeck({ id: "local", source: "local" }),
        },
      }),
      deckEdits: {},
      sharing: {
        decks: {
          local: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    migrate(state, 9);

    expect(state.settings?.flags?.migrationNeeded).toBe(true);
  });

  it("does not require account migration without legacy account decks", () => {
    const state: LegacyState = {
      data: makeData({
        decks: {
          local: makeTestDeck({ id: "local", source: "local" }),
        },
      }),
      deckEdits: {},
    };

    migrate(state, 9);

    expect(state.settings?.flags?.migrationNeeded).toBeUndefined();
  });

  it("repairs deck links and history after removing arkhamdb decks", () => {
    const state: LegacyState = {
      data: makeData({
        decks: {
          previous: makeTestDeck({
            id: "previous",
            source: "local",
            next_deck: "remote",
          }),
          remote: makeTestDeck({
            id: "remote",
            source: "arkhamdb",
            previous_deck: "previous",
            next_deck: "latest",
          }),
          latest: makeTestDeck({
            id: "latest",
            source: "local",
            previous_deck: "remote",
          }),
        },
        history: {
          latest: ["remote", "previous"],
        },
      }),
      deckEdits: {},
      sharing: { decks: {} },
    };

    migrate(state, 9);

    expect(state.data?.decks.previous).toMatchObject({
      previous_deck: null,
      next_deck: null,
    });
    expect(state.data?.decks.latest).toMatchObject({
      previous_deck: null,
      next_deck: null,
    });
    expect(state.data?.history).toEqual({
      previous: [],
      latest: [],
    });
    expect(state.settings?.flags?.migrationNeeded).toBe(true);
  });
});
