import type { Deck, DeckManifestResponse } from "@arkham-build/shared";
import { describe, expect, it } from "vitest";
import {
  makeData,
  makeTestDeck,
  makeSyncItem as makeTestSyncItem,
} from "@/test/factories";
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
        fetchTargets: [
          { provider: "account", id: "1" },
          { provider: "account", id: "2" },
        ],
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
        fetchTargets: [],
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
        fetchTargets: [],
        removeIds: [],
        skippedIds: ["saving", "conflict"],
      });
    });

    it("skips removing arkhamdb decks when arkhamdb is unavailable", () => {
      const plan = getDeckReconciliationPlan({
        data: makeData({
          decks: {
            remote: makeDeck("remote", "v1", {
              source: "arkhamdb",
            }),
          },
        }),
        manifest: makeManifest([], { arkhamdbAvailable: false }),
        syncDecks: makeSyncDecks({
          remote: makeSyncItem("v1"),
        }),
      });

      expect(plan).toEqual({
        fetchTargets: [],
        removeIds: [],
        skippedIds: ["remote"],
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
              source: "account",
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

    it("removes only the selected remote provider", () => {
      const result = removeRemoteAccountDecks(
        {
          data: makeData({
            decks: {
              account: makeDeck("account", "v1", { source: "account" }),
              arkhamdb: makeDeck("arkhamdb", "v1", { source: "arkhamdb" }),
            },
            history: {
              account: [],
              arkhamdb: [],
            },
          }),
          deckEdits: {},
        },
        { providers: ["arkhamdb"] },
      );

      expect(result.data.decks.account).toBeDefined();
      expect(result.data.decks.arkhamdb).toBeUndefined();
      expect(result.data.history).toEqual({ account: [] });
    });
  });

  describe("applyRemoteDeckReconciliation", () => {
    it("applies fetched decks and rebuilds history", () => {
      const previousDeck = makeDeck("previous", "v1", {
        source: "local",
        next_deck: "latest",
      });
      const latestDeck = makeDeck("latest", "v1", {
        source: "account",
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
          fetchTargets: [
            { provider: "account", id: "previous" },
            { provider: "account", id: "latest" },
          ],
          removeIds: [],
          skippedIds: [],
        },
        remoteDecks: [previousDeck, latestDeck],
        syncDecks: makeSyncDecks(),
      });

      expect(result.data.decks).toMatchObject({
        previous: { id: "previous", source: "local" },
        latest: { id: "latest", source: "account" },
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
          fetchTargets: [],
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

    it("repairs deck links when only the child deck was fetched", () => {
      const result = applyRemoteDeckReconciliation({
        accountId: "account-id",
        data: makeData({
          decks: {
            parent: makeDeck("parent", "v1", {
              source: "arkhamdb",
            }),
          },
        }),
        deckEdits: {},
        manifest: makeManifest([
          ["parent", "v1", "arkhamdb"],
          ["child", "v1", "arkhamdb"],
        ]),
        plan: {
          fetchTargets: [{ provider: "arkhamdb", id: "child" }],
          removeIds: [],
          skippedIds: [],
        },
        remoteDecks: [
          makeDeck("child", "v1", {
            source: "arkhamdb",
            previous_deck: "parent",
          }),
        ],
        syncDecks: makeSyncDecks({
          parent: makeSyncItem("v1"),
        }),
      });

      expect(result.data.decks.parent).toMatchObject({
        id: "parent",
        next_deck: "child",
      });
      expect(result.data.decks.child).toMatchObject({
        id: "child",
        previous_deck: "parent",
      });
      expect(result.data.history).toEqual({ child: ["parent"] });
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
          fetchTargets: [],
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

    it("marks reconciliation partial when non-conflicted decks are skipped", () => {
      const result = applyRemoteDeckReconciliation({
        accountId: "account-id",
        data: makeData({
          decks: {
            skipped: makeDeck("skipped"),
          },
        }),
        deckEdits: {},
        manifest: makeManifest([]),
        plan: {
          fetchTargets: [],
          removeIds: [],
          skippedIds: ["skipped"],
        },
        remoteDecks: [],
        syncDecks: makeSyncDecks(
          {
            skipped: makeSyncItem("v1"),
          },
          "previous-manifest-version",
        ),
      });

      expect(result.syncDecks.manifestVersion).toBe(
        "previous-manifest-version",
      );
      expect(result.syncDecks.status).toBe("partial");
    });
  });
});

function makeManifest(
  decks: Array<[string, string] | [string, string, "account" | "arkhamdb"]>,
  { arkhamdbAvailable = true }: { arkhamdbAvailable?: boolean } = {},
): DeckManifestResponse {
  return {
    version: "manifest-version",
    decks: decks.map(([id, version, provider = "account"]) => ({
      provider,
      id,
      version,
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
    arkhamdbSyncToken: null,
    providers: {
      account: { available: true },
      arkhamdb: { available: arkhamdbAvailable },
    },
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
  return makeTestSyncItem({
    version,
    status,
    conflict:
      status === "conflict"
        ? {
            kind: "update",
            remoteVersion: "v2",
          }
        : null,
  });
}

function makeDeck(
  id: string,
  version = "v1",
  overrides: Partial<Deck> = {},
): Deck {
  return makeTestDeck({ id, version, ...overrides });
}
