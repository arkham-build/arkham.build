import {
  type DecklistConfig,
  type ListConfig,
  type Settings,
  type SettingsResponse,
  SettingsSchema,
} from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { changeLanguage } from "@/utils/i18n";
import { fromRemoteSettings, toRemoteSettings } from "../lib/settings-sync";
import { dehydrate } from "../persist";
import type { HttpClient } from "../services/http-client";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "../services/requests/cache";
import {
  fetchSettings,
  isSettingsConflictError,
  putSettings,
} from "../services/requests/settings";
import type { StoreState } from ".";
import { makeLists } from "./lists";

export type SettingsSlice = {
  settings: Settings;
} & {
  setFlag(key: string, value: boolean): Promise<void>;
  toggleFlag(key: string): Promise<void>;
  applySettings: (
    client: HttpClient,
    payload: Settings,
    opts?: { keepListState?: boolean },
  ) => Promise<void>;
  applyRemoteSettings(
    client: HttpClient,
    payload: SettingsResponse,
  ): Promise<void>;
  loadRemoteSettings(client: HttpClient): Promise<void>;
  saveSettings(
    client: HttpClient,
    payload: Settings,
    opts?: { expectedRevision?: string | null; keepListState?: boolean },
  ): Promise<void>;
  setSettings(payload: Partial<Settings>): Promise<void>;
};

export const PLAYER_DEFAULTS: ListConfig = {
  group: ["subtype", "type", "slot"],
  sort: ["name", "level", "position"],
  viewMode: "compact",
};

export const ENCOUNTER_DEFAULTS: ListConfig = {
  group: ["pack", "encounter_set"],
  sort: ["position"],
  viewMode: "compact",
};

export const INVESTIGATOR_DEFAULTS: ListConfig = {
  group: ["cycle"],
  sort: ["position"],
  viewMode: "compact",
};

export const MIXED_DEFAULTS: ListConfig = {
  group: ["pack", "encounter_set"],
  sort: ["position"],
  viewMode: "compact",
};

export const DECK_DEFAULTS: DecklistConfig = {
  group: ["type", "slot"],
  sort: ["name", "level"],
};

export const DECK_SCANS_DEFAULTS: DecklistConfig = {
  group: ["type"],
  sort: ["slot", "name", "level", "position"],
};

export function getInitialListsSetting(): Settings["lists"] {
  return {
    deck: structuredClone(DECK_DEFAULTS),
    deckScans: structuredClone(DECK_SCANS_DEFAULTS),
    encounter: structuredClone(ENCOUNTER_DEFAULTS),
    investigator: structuredClone(INVESTIGATOR_DEFAULTS),
    mixed: structuredClone(MIXED_DEFAULTS),
    player: structuredClone(PLAYER_DEFAULTS),
  };
}

export function getInitialSettings(): Settings {
  return SettingsSchema.parse({
    cardLevelDisplay: "icon-only",
    cardListsDefaultContentType: "all",
    cardSkillIconsDisplay: "simple",
    defaultEnvironment: "legacy",
    defaultStorageProvider: "local",
    devModeEnabled: false,
    cardShowIcon: true,
    cardShowDetails: true,
    cardShowTags: true,
    cardShowFavoriteHighlights: true,
    cardSize: "standard",
    cardShowThumbnail: true,
    collection: {},
    flags: {},
    fontSize: 100,
    hideWeaknessesByDefault: false,
    lists: getInitialListsSetting(),
    locale: "en",
    notesEditor: {
      defaultFormat: "paragraph",
      defaultOrigin: "player",
    },
    showAllCards: true,
    showCardModalPopularDecks: true,
    showMoveToSideDeck: false,
    showPreviews: false,
    sortIgnorePunctuation: false,
    tabooSetId: undefined,
    useLimitedPoolForWeaknessDraw: true,
  });
}

export const createSettingsSlice: StateCreator<
  StoreState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: getInitialSettings(),
  async applySettings(client, settings, { keepListState } = {}) {
    const state = get();
    const resetLists =
      !keepListState && shouldResetLists(state.settings, settings);

    if (settings.locale !== state.settings.locale) {
      // This has to happen first, since the constructed metadata in `init` depends on the locale in some places.
      // TODO: once reprint packs are returned localized by the API, remove this.
      await changeLanguage(settings.locale);

      await get().init(
        (locale) => queryMetadata(client, locale),
        (locale) => queryDataVersion(client, locale),
        (locale) => queryCards(client, locale),
        {
          refresh: true,
          locale: settings.locale,
          overrides: {
            lists: resetLists ? makeLists(settings) : state.lists,
            settings: {
              ...state.settings,
              ...settings,
            },
            sync: state.sync,
          },
        },
      );
    } else {
      set({
        settings,
        ...(resetLists ? { lists: makeLists(settings) } : {}),
      });

      await dehydrate(get(), "app");
    }
  },
  async applyRemoteSettings(client, response) {
    const state = get();

    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot apply remote settings without an account.");

    const localSettings = get().settings;

    await get().applySettings(
      client,
      SettingsSchema.parse({
        ...fromRemoteSettings(response.settings, localSettings),
        collection: response.collection ?? localSettings.collection,
      }),
    );

    if (!isCurrentAccount(get(), accountId)) {
      return;
    }

    get().setSettingsSync({
      accountId,
      revision: response.revision,
      lastSyncedAt: Date.now(),
      status: "synced",
      error: null,
      conflict: null,
    });

    await dehydrate(get(), "app");
  },
  async loadRemoteSettings(client) {
    const state = get();

    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot load remote settings without an account.");

    get().setSettingsSync({
      accountId,
      status: "loading",
      error: null,
      conflict: null,
    });

    try {
      const response = await fetchSettings(client);

      if (!isCurrentAccount(get(), accountId)) {
        return;
      }

      await get().applyRemoteSettings(client, response);
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) {
        return;
      }

      get().setSettingsSync({
        status: "error",
        error: getErrorMessage(error),
        conflict: null,
      });
      await dehydrate(get(), "app");
      throw error;
    }
  },
  async saveSettings(client, settings, opts) {
    await get().applySettings(client, settings, opts);

    const state = get();
    const accountId = state.auth.session?.account.id;

    if (!accountId) {
      await dehydrate(get(), "app");
      return;
    }

    const expectedRevision =
      opts?.expectedRevision !== undefined
        ? opts.expectedRevision
        : get().sync.settings.accountId === accountId
          ? get().sync.settings.revision
          : null;

    get().setSettingsSync({
      accountId,
      status: "saving",
      error: null,
      conflict: null,
    });

    try {
      const response = await putSettings(client, {
        settings: toRemoteSettings(settings),
        collection: settings.collection,
        expectedRevision,
      });

      if (!isCurrentAccount(get(), accountId)) {
        return;
      }

      get().setSettingsSync({
        accountId,
        revision: response.revision,
        lastSyncedAt: Date.now(),
        status: "synced",
        error: null,
        conflict: null,
      });
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) {
        return;
      }

      if (isSettingsConflictError(error)) {
        get().setSettingsSync({
          accountId,
          status: "conflict",
          error: getErrorMessage(error),
          conflict: error.remote,
        });
      } else {
        get().setSettingsSync({
          accountId,
          status: "error",
          error: getErrorMessage(error),
          conflict: null,
        });
      }

      await dehydrate(get(), "app");
      throw error;
    }
  },
  async setSettings(payload) {
    set((state) => ({
      settings: {
        ...state.settings,
        ...payload,
      },
    }));

    await dehydrate(get(), "app");
  },
  async setFlag(key, value) {
    set((state) => ({
      settings: {
        ...state.settings,
        flags: {
          ...state.settings.flags,
          [key]: value,
        },
      },
    }));

    await dehydrate(get(), "app");
  },
  async toggleFlag(key) {
    set((state) => ({
      settings: {
        ...state.settings,
        flags: {
          ...state.settings.flags,
          [key]: !state.settings.flags?.[key],
        },
      },
    }));

    await dehydrate(get(), "app");
  },
});

function shouldResetLists(prev: Settings, next: Settings) {
  return (
    prev.cardListsDefaultContentType !== next.cardListsDefaultContentType ||
    prev.showAllCards !== next.showAllCards ||
    prev.showPreviews !== next.showPreviews ||
    JSON.stringify(prev.lists) !== JSON.stringify(next.lists)
  );
}

function isCurrentAccount(state: StoreState, accountId: string) {
  return (
    state.auth.status === "authenticated" &&
    state.auth.session?.account.id === accountId
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
