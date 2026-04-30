import type { DeckManifestResponse } from "@arkham-build/shared";
import { describe, expect, it } from "vitest";
import type { Deck } from "../schemas/deck.schema";
import type { StoreState } from "../slices";
import type { DecksSyncState, SyncStatus } from "../slices/sync.types";
import {
  applyRemoteDeckReconciliation,
  getDeckReconciliationPlan,
  removeRemoteAccountDecks,
} from "./sync-reconciliation";

describe("sync reconciliation", () => {
  describe("getDeckReconciliationPlan", () => {
    it("fetches missing and changed remote decks", () => {
      const plan = getDeckReconciliationPlan({
        data: makeData({ decks: { "1": makeDeck("1", "v1") } }),
        manifest: makeManifest([
          ["1", "v2"],
          ["2", "v1"],
        ]),
        syncDecks: makeSyncDecks({
          "1": makeSyncItem("v1"),
        }),
      });

      expect(plan).toEqual({
        fetchIds: ["1", "2"],
        removeIds: [],
        skippedIds: [],
      });
    });

    it("removes synced local decks missing from the manifest", () => {
      const plan = getDeckReconciliationPlan({
        data: makeData({
          decks: {
            local: makeDeck("local"),
            remote: makeDeck("remote"),
          },
        }),
        manifest: makeManifest([]),
        syncDecks: makeSyncDecks({
          remote: makeSyncItem("v1"),
        }),
      });

      expect(plan).toEqual({
        fetchIds: [],
        removeIds: ["remote"],
        skippedIds: [],
      });
    });

    it("skips saving and conflict items", () => {
      const plan = getDeckReconciliationPlan({
        data: makeData({
          decks: {
            conflict: makeDeck("conflict", "v1"),
            saving: makeDeck("saving", "v1"),
          },
        }),
        manifest: makeManifest([["saving", "v2"]]),
        syncDecks: makeSyncDecks({
          conflict: makeSyncItem("v1", "conflict"),
          saving: makeSyncItem("v1", "saving"),
        }),
      });

      expect(plan).toEqual({
        fetchIds: [],
        removeIds: [],
        skippedIds: ["saving", "conflict"],
      });
    });
  });

  describe("removeRemoteAccountDecks", () => {
    it("removes remote decks and repairs local history", () => {
      const result = removeRemoteAccountDecks({
        data: makeData({
          decks: {
            local: makeDeck("local", "v1", {
              previous_deck: "remote",
            }),
            remote: makeDeck("remote", "v1", {
              source: "remote",
              next_deck: "local",
            }),
          },
          history: {
            local: ["remote"],
            remote: [],
          },
          deckFolders: {
            remote: "folder-id",
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
      });

      expect(result.data.decks.remote).toBeUndefined();
      expect(result.data.decks.local).toMatchObject({
        id: "local",
        previous_deck: null,
      });
      expect(result.data.history).toEqual({ local: [] });
      expect(result.data.deckFolders.remote).toBeUndefined();
      expect(result.data.undoHistory?.remote).toBeUndefined();
      expect(result.deckEdits.remote).toBeUndefined();
    });
  });

  describe("applyRemoteDeckReconciliation", () => {
    it("applies fetched decks and rebuilds history", () => {
      const previousDeck = makeDeck("previous", "v1", {
        source: "local",
        next_deck: "latest",
      });
      const latestDeck = makeDeck("latest", "v1", {
        source: "remote",
        previous_deck: "previous",
      });

      const result = applyRemoteDeckReconciliation({
        accountId: "account-id",
        data: makeData(),
        deckEdits: {},
        manifest: makeManifest([
          ["previous", "v1"],
          ["latest", "v1"],
        ]),
        plan: {
          fetchIds: ["previous", "latest"],
          removeIds: [],
          skippedIds: [],
        },
        remoteDecks: [previousDeck, latestDeck],
        syncDecks: makeSyncDecks(),
      });

      expect(result.data.decks).toMatchObject({
        previous: { id: "previous", source: "local" },
        latest: { id: "latest", source: "remote" },
      });
      expect(result.data.history).toEqual({ latest: ["previous"] });
      expect(result.syncDecks.manifestVersion).toBe("manifest-version");
      expect(result.syncDecks.items.latest).toMatchObject({
        version: "v1",
        status: "synced",
      });
    });

    it("removes deleted remote decks and keeps local-only decks", () => {
      const result = applyRemoteDeckReconciliation({
        accountId: "account-id",
        data: makeData({
          decks: {
            local: makeDeck("local"),
            remote: makeDeck("remote"),
          },
          history: {
            local: [],
            remote: [],
          },
          deckFolders: {
            remote: "folder-id",
          },
          undoHistory: {
            remote: [],
          },
        }),
        deckEdits: {
          remote: {},
        },
        manifest: makeManifest([]),
        plan: {
          fetchIds: [],
          removeIds: ["remote"],
          skippedIds: [],
        },
        remoteDecks: [],
        syncDecks: makeSyncDecks({
          remote: makeSyncItem("v1"),
        }),
      });

      expect(result.data.decks.remote).toBeUndefined();
      expect(result.data.decks.local).toBeDefined();
      expect(result.data.deckFolders.remote).toBeUndefined();
      expect(result.data.undoHistory?.remote).toBeUndefined();
      expect(result.deckEdits.remote).toBeUndefined();
      expect(result.syncDecks.items.remote).toBeUndefined();
    });

    it("does not commit the manifest version when a deck is skipped", () => {
      const result = applyRemoteDeckReconciliation({
        accountId: "account-id",
        data: makeData({
          decks: {
            conflict: makeDeck("conflict"),
          },
        }),
        deckEdits: {},
        manifest: makeManifest([]),
        plan: {
          fetchIds: [],
          removeIds: [],
          skippedIds: ["conflict"],
        },
        remoteDecks: [],
        syncDecks: makeSyncDecks(
          {
            conflict: makeSyncItem("v1", "conflict"),
          },
          "previous-manifest-version",
        ),
      });

      expect(result.syncDecks.manifestVersion).toBe(
        "previous-manifest-version",
      );
      expect(result.syncDecks.status).toBe("conflict");
    });
  });
});

function makeManifest(decks: [string, string][]): DeckManifestResponse {
  return {
    version: "manifest-version",
    decks: decks.map(([id, version]) => ({
      id,
      version,
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  };
}

function makeSyncDecks(
  items: DecksSyncState["items"] = {},
  manifestVersion: string | null = null,
): DecksSyncState {
  return {
    accountId: "account-id",
    manifestVersion,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    items,
  };
}

function makeSyncItem(version: string, status: SyncStatus = "synced") {
  return {
    version,
    status,
    lastSyncedAt: null,
    error: null,
    conflict:
      status === "conflict"
        ? {
            kind: "update" as const,
            remoteVersion: "v2",
          }
        : null,
  };
}

function makeData(overrides: Partial<StoreState["data"]> = {}) {
  return {
    decks: {},
    folders: {},
    deckFolders: {},
    history: {},
    ...overrides,
  };
}

function makeDeck(
  id: string,
  version = "v1",
  overrides: Partial<Deck> = {},
): Deck {
  return {
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    exile_string: null,
    id,
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
    version,
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
    ...overrides,
  };
}
