import type { Deck } from "@arkham-build/shared";
import type { StoreState } from "@/store/slices";
import type { DeckSyncItemState, SyncStatus } from "@/store/slices/sync.types";

type Session = NonNullable<StoreState["auth"]["session"]>;

type AuthOptions = {
  account?: Partial<Session["account"]>;
  identities?: Session["identities"];
};

type SyncStateOptions = {
  accountId?: string | null;
  deckItems?: StoreState["sync"]["decks"]["items"];
  deckStatus?: SyncStatus;
  cardTags?: Partial<StoreState["sync"]["cardTags"]>;
  folders?: Partial<StoreState["sync"]["folders"]>;
  lastSyncedAt?: number | null;
  manifestVersion?: string | null;
  settings?: Partial<StoreState["sync"]["settings"]>;
  decks?: Partial<StoreState["sync"]["decks"]>;
};

export function makeTestDeck(overrides: Partial<Deck> = {}): Deck {
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

export function makeData(
  overrides: Partial<StoreState["data"]> = {},
): StoreState["data"] {
  return {
    decks: {},
    folders: {},
    deckFolders: {},
    history: {},
    ...overrides,
  };
}

export function makeAuthenticatedAuth({
  account,
  identities = [],
}: AuthOptions = {}): StoreState["auth"] {
  return {
    status: "authenticated",
    session: {
      account: {
        id: "account-id",
        name: "User",
        profileComplete: true,
        ...account,
      },
      identities,
    },
  };
}

export function makeSyncState({
  accountId = "account-id",
  deckItems = {},
  deckStatus = "synced",
  cardTags,
  folders,
  lastSyncedAt = null,
  manifestVersion = "1",
  settings,
  decks,
}: SyncStateOptions = {}): StoreState["sync"] {
  return {
    settings: {
      accountId,
      revision: "1",
      lastSyncedAt,
      status: "synced",
      error: null,
      conflict: null,
      ...settings,
    },
    decks: {
      accountId,
      manifestVersion,
      lastSyncedAt,
      status: deckStatus,
      error: null,
      items: deckItems,
      ...decks,
    },
    folders: {
      accountId,
      revision: "1",
      lastSyncedAt,
      status: "synced",
      error: null,
      conflict: null,
      ...folders,
    },
    cardTags: {
      accountId,
      revision: "1",
      lastSyncedAt,
      status: "synced",
      error: null,
      conflict: null,
      ...cardTags,
    },
  };
}

export function makeSyncItem(
  overrides: Partial<DeckSyncItemState> = {},
): DeckSyncItemState {
  return {
    version: "1",
    status: "synced",
    lastSyncedAt: null,
    error: null,
    conflict: null,
    ...overrides,
  };
}

export function makeConflictSyncItem(
  overrides: Partial<DeckSyncItemState> = {},
): DeckSyncItemState {
  return makeSyncItem({
    status: "conflict",
    conflict: {
      kind: "update",
      remoteVersion: "2",
    },
    ...overrides,
  });
}
