import type { StorageProvider } from "@arkham-build/shared";
import { FACTION_ORDER, type FactionName } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { displayAttribute } from "@/utils/card-utils";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import { formatProviderName } from "@/utils/formatting";
import { and, or } from "@/utils/fp";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import i18n from "@/utils/i18n";
import type { LookupTables } from "../lib/lookup-tables.types";
import { deckTags } from "../lib/resolve-deck";
import type { DeckSummary, ResolvedDeck } from "../lib/types";
import type { StoreState } from "../slices";
import { createArchiveFolder } from "../slices/data";
import type { Folder } from "../slices/data.types";
import type {
  DeckFiltersKey,
  DeckProperties,
  DeckPropertyName,
  DeckValidity,
  RangeMinMax,
  SortOrder,
} from "../slices/deck-collection.types";
import type { MultiselectFilter } from "../slices/lists.types";
import { selectLocalDeckSummaries } from "./decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "./shared";

// Arbitrarily chosen for now
const MATCHING_MAX_TOKEN_DISTANCE_DECKS = 4;

const selectDeckFilters = (state: StoreState) => state.deckCollection.filters;

export const selectDeckFilterValue = createSelector(
  selectDeckFilters,
  (_: StoreState, filter: DeckFiltersKey) => filter,
  (filters, filter) => filters[filter],
);

// Search
export const selectDeckSearchTerm = (state: StoreState) =>
  state.deckCollection.filters.search;

// Faction
export const selectDeckFactionFilter = (state: StoreState) =>
  state.deckCollection.filters.faction;

const filterDeckByFaction = (faction: string) => {
  return (deck: DeckSummary) =>
    deck.investigatorFront.card.faction_code === faction;
};

const makeDeckFactionFilter = (values: MultiselectFilter) => {
  return or(values.map((value) => filterDeckByFaction(value)));
};

// Tag
const filterDeckByTag = (tag: string) => {
  return (deck: DeckSummary) => deckTags(deck).includes(tag);
};

const makeDeckTagsFilter = (values: MultiselectFilter) => {
  return or(values.map((value) => filterDeckByTag(value)));
};

export const selectTagsChanges = createSelector(
  selectDeckFilters,
  (filters) => {
    const tagsFilters = filters.tags;
    if (!tagsFilters.length) return "";
    return tagsFilters.join(` ${i18n.t("common.or")} `);
  },
);

const filterDeckByCard = (cardCode: string, lookupTables: LookupTables) => {
  return (deck: DeckSummary) => {
    const allCodes = [
      ...Object.keys(deck.slots),
      ...Object.keys(deck.sideSlots ?? {}),
      ...Object.keys(deck.extraSlots ?? {}),
    ];

    const duplicates = Object.keys(
      lookupTables.relations.duplicates[cardCode] ?? {},
    );
    return allCodes.some(
      (code) => code === cardCode || duplicates.includes(code),
    );
  };
};

const makeDeckCardsFilter = (
  values: MultiselectFilter,
  lookupTables: LookupTables,
) => {
  return and(values.map((value) => filterDeckByCard(value, lookupTables)));
};

export const selectCardsChanges = createSelector(
  selectDeckFilters,
  selectMetadata,
  (filters, metadata) => {
    const cardsFilters = filters.cards;
    if (!cardsFilters.length) return "";
    return cardsFilters
      .map((code) => displayAttribute(metadata.cards[code], "name"))
      .join(` ${i18n.t("filters.and")} `);
  },
);

// Properties
const selectDeckPropertiesFilter = (state: StoreState) =>
  state.deckCollection.filters.properties;

export const selectDeckProperties = createSelector(
  (state: StoreState) => state.deckCollection.filters.properties,
  (_) => {
    return {
      parallel: i18n.t("common.parallel"),
    } as Record<string, string>;
  },
);

export const selectDeckPropertiesChanges = createSelector(
  selectDeckPropertiesFilter,
  selectDeckProperties,
  (filterValues, properties) => {
    return Object.keys(filterValues)
      .filter((prop) => filterValues[prop as DeckPropertyName])
      .map((prop) => properties[prop])
      .join(` ${i18n.t("filters.and")} `);
  },
);

const makeDeckPropertiesFilter = (properties: DeckProperties) => {
  const filters = [];
  for (const property of Object.keys(properties)) {
    if (properties[property as DeckPropertyName]) {
      switch (property) {
        case "parallel": {
          filters.push((deck: DeckSummary) =>
            Boolean(
              deck.investigatorFront.card.parallel ||
                deck.investigatorBack.card.parallel,
            ),
          );
        }
      }
    }
  }
  return and(filters);
};

// Validity
const makeDeckValidityFilter = (value: Omit<DeckValidity, "all">) => {
  switch (value) {
    case "valid":
      return (deck: DeckSummary) => deck.problem == null;
    case "invalid":
      return (deck: DeckSummary) => Boolean(deck.problem);
    default:
      return () => true;
  }
};

// Exp Cost
export const selectDecksMinMaxXpCost = createSelector(
  selectLocalDeckSummaries,
  (decks) => {
    const minmax: RangeMinMax = decks.reduce<[number, number]>(
      (acc, val) => {
        const { xpRequired } = val.stats;
        acc[0] = Math.min(acc[0], xpRequired);
        acc[1] = Math.max(acc[1], xpRequired);
        return acc;
      },
      [Number.POSITIVE_INFINITY, 0],
    );
    return minmax;
  },
);

export const selectXpCostChanges = createSelector(
  selectDeckFilters,
  (filters) => {
    const xpMinMax = filters.xpCost;
    return xpMinMax
      ? `${xpMinMax[0]}-${xpMinMax[1]} ${i18n.t("common.xp", { count: 2 })}`
      : "";
  },
);

const makeDeckXpCostFilter = (minmax: [number, number]) => {
  return (deck: DeckSummary) => {
    return (
      deck.stats.xpRequired >= minmax[0] && deck.stats.xpRequired <= minmax[1]
    );
  };
};

const makeDeckProviderFilter = (values: StorageProvider[]) => {
  return (deck: DeckSummary) => {
    return (
      !values.length ||
      values.some((val) => {
        return (
          (val === "account" && deck.source === "account") ||
          (val === "arkhamdb" && deck.source === "arkhamdb") ||
          (val === "local" && (!deck.source || deck.source === "local"))
        );
      })
    );
  };
};

const selectFilteringFunc = createSelector(
  selectDeckFilters,
  selectLookupTables,
  (filters, lookupTables) => {
    const filterFuncs = [];
    for (const filter of Object.keys(filters) as DeckFiltersKey[]) {
      switch (filter) {
        case "cards": {
          const currentFilter = filters[filter];
          if (currentFilter.length) {
            filterFuncs.push(makeDeckCardsFilter(currentFilter, lookupTables));
          }
          break;
        }

        case "faction": {
          const currentFilter = filters[filter];
          if (currentFilter.length) {
            filterFuncs.push(makeDeckFactionFilter(currentFilter));
          }
          break;
        }

        case "tags": {
          const currentFilter = filters[filter];
          if (currentFilter.length) {
            filterFuncs.push(makeDeckTagsFilter(currentFilter));
          }
          break;
        }

        case "properties": {
          const currentFilter = filters[filter];
          filterFuncs.push(
            makeDeckPropertiesFilter(currentFilter as DeckProperties),
          );
          break;
        }

        case "validity": {
          const currentFilter = filters[filter];
          if (currentFilter !== "all") {
            filterFuncs.push(makeDeckValidityFilter(currentFilter));
          }
          break;
        }

        case "xpCost": {
          const currentFilter = filters[filter];
          if (currentFilter) {
            filterFuncs.push(makeDeckXpCostFilter(currentFilter));
          }
          break;
        }

        case "provider": {
          const currentFilter = filters[filter];
          if (currentFilter) {
            filterFuncs.push(makeDeckProviderFilter(currentFilter));
          }
          break;
        }
      }
    }

    return and(filterFuncs);
  },
);

export const selectFactionsInLocalDecks = createSelector(
  selectLocalDeckSummaries,
  selectMetadata,
  (decks, metadata) => {
    if (!decks) return [];

    const factionsSet = new Set<string>();

    for (const deck of decks) {
      factionsSet.add(deck.investigatorFront.card.faction_code);
    }

    const factions = Array.from(factionsSet).map(
      (code) => metadata.factions[code],
    );

    return factions.sort(
      (a, b) =>
        FACTION_ORDER.indexOf(a.code as FactionName) -
        FACTION_ORDER.indexOf(b.code as FactionName),
    );
  },
);

export const selectTagsInLocalDecks = createSelector(
  selectLocalDeckSummaries,
  selectLocaleSortingCollator,
  (decks, collator) =>
    Array.from(new Set(decks.flatMap((deck) => deckTags(deck))))
      .sort((a, b) => collator.compare(a.toLowerCase(), b.toLowerCase()))
      .map((code) => ({ code })),
);

const selectDecksFiltered = createSelector(
  selectLocalDeckSummaries,
  selectDeckSearchTerm,
  selectFilteringFunc,
  (decks, searchTerm, filterFunc) => {
    let decksToFilter: DeckSummary[];

    if (searchTerm) {
      const needle = prepareNeedle(
        searchTerm,
        MATCHING_MAX_TOKEN_DISTANCE_DECKS,
      );

      if (needle) {
        decksToFilter = decks.filter((deck) => {
          const text = [
            deck.name,
            displayAttribute(deck.investigatorFront.card, "name"),
          ];
          return fuzzyMatch(text, needle);
        });
      } else {
        decksToFilter = decks;
      }
    } else {
      decksToFilter = decks;
    }

    const filteredDecks = decksToFilter.filter(filterFunc);
    return {
      decks: filteredDecks ?? decks,
      total: decks.length,
    };
  },
);

const selectDecksSorting = (state: StoreState) => state.deckCollection.sort;

function genericSort(a: string | number, b: string | number, order: SortOrder) {
  const mod = order === "desc" ? -1 : 1;
  return a < b ? -1 * mod : a > b ? 1 * mod : 0;
}

function dateSort(a: string, b: string, order: SortOrder) {
  const mod = order === "desc" ? -1 : 1;

  return new Date(a) < new Date(b)
    ? -1 * mod
    : new Date(a) > new Date(b)
      ? 1 * mod
      : 0;
}

function makeAlphabeticalSort(order: SortOrder) {
  return (a: Pick<ResolvedDeck, "name">, b: Pick<ResolvedDeck, "name">) =>
    genericSort(a.name, b.name, order);
}

function makeDeckCreatedSort(order: SortOrder) {
  return (
    a: Pick<ResolvedDeck, "date_creation">,
    b: Pick<ResolvedDeck, "date_creation">,
  ) => dateSort(a.date_creation, b.date_creation, order);
}

function makeDeckUpdatedSort(order: SortOrder) {
  return (
    a: Pick<ResolvedDeck, "date_update">,
    b: Pick<ResolvedDeck, "date_update">,
  ) => dateSort(a.date_update, b.date_update, order);
}

function makeXPSort(order: SortOrder) {
  return (
    a: { stats: { xpRequired: number } },
    b: { stats: { xpRequired: number } },
  ) => genericSort(a.stats.xpRequired, b.stats.xpRequired, order);
}

const selectDecksSortingFunc = createSelector(
  selectDecksSorting,
  (sortingInfo) => {
    switch (sortingInfo.criteria) {
      case "alphabetical": {
        return makeAlphabeticalSort(sortingInfo.order);
      }
      case "date_updated": {
        return makeDeckUpdatedSort(sortingInfo.order);
      }
      case "xp": {
        return makeXPSort(sortingInfo.order);
      }
      case "date_created": {
        return makeDeckCreatedSort(sortingInfo.order);
      }
      default: {
        return makeDeckUpdatedSort(sortingInfo.order);
      }
    }
  },
);

type DecklistEntry = DeckEntry | FolderEntry;

type DeckEntry = {
  deck: DeckSummary;
  depth: number;
  folder?: Folder;
  type: "deck";
};

type FolderEntry = {
  count: number;
  depth: number;
  expanded: boolean;
  folder: Folder;
  type: "folder";
};

export const selectDecksDisplayList = createSelector(
  selectDecksFiltered,
  selectDecksSortingFunc,
  (state: StoreState) => state.data.folders,
  (state: StoreState) => state.data.deckFolders,
  (state: StoreState) => state.deckCollection.expandedFolders,
  (filteredDecks, sorting, folders, deckFolders, expandedFolders) => {
    const resolvedFolders = Object.values(deckFolders).includes(
      ARCHIVE_FOLDER_ID,
    )
      ? {
          ...folders,
          [ARCHIVE_FOLDER_ID]:
            folders[ARCHIVE_FOLDER_ID] ?? createArchiveFolder(),
        }
      : folders;
    const folderHierarchy: Record<string, string[]> = {};
    const decksByFolderId: Record<string, DeckSummary[]> = {};
    const uncategorizedDecks: DeckSummary[] = [];

    for (const folder of Object.values(resolvedFolders)) {
      const parentId = folder.parent_id;

      if (parentId && resolvedFolders[parentId]) {
        folderHierarchy[parentId] ??= [];
        folderHierarchy[parentId].push(folder.id);
      }
    }

    for (const deck of filteredDecks.decks) {
      const folderId = deckFolders[deck.id];
      const folder = folderId ? resolvedFolders[folderId] : undefined;

      if (folder) {
        decksByFolderId[folder.id] ??= [];
        decksByFolderId[folder.id].push(deck);
      } else {
        uncategorizedDecks.push(deck);
      }
    }

    const sorted: DecklistEntry[] = [];

    const rootFolders = Object.values(resolvedFolders)
      .filter(
        (folder) => !folder.parent_id || !resolvedFolders[folder.parent_id],
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const traverse = (folder: Folder, depth: number) => {
      const expanded = expandedFolders[folder.id] ?? false;
      const decksInFolder = decksByFolderId[folder.id] ?? [];
      const childFolders = (folderHierarchy[folder.id] ?? [])
        .map((id) => resolvedFolders[id])
        .filter((childFolder): childFolder is Folder => childFolder != null)
        .sort((a, b) => a.name.localeCompare(b.name));

      sorted.push({
        count: decksInFolder.length,
        expanded,
        folder,
        depth,
        type: "folder",
      });

      for (const childFolder of childFolders) {
        traverse(childFolder, depth + 1);
      }

      if (!expanded) {
        return;
      }

      for (const deck of [...decksInFolder].sort(sorting)) {
        sorted.push({
          deck,
          depth: depth + 1,
          folder,
          type: "deck",
        });
      }
    };

    for (const folder of rootFolders) {
      traverse(folder, 0);
    }

    for (const deck of uncategorizedDecks.sort(sorting)) {
      sorted.push({ deck, depth: 0, type: "deck" });
    }

    return {
      entries: sorted,
      total: filteredDecks.total,
      deckCount: filteredDecks.decks.length,
    };
  },
);

const selectDeckFactionChanges = createSelector(
  selectDeckFilters,
  (filters) => {
    const factionFilters = filters.faction;
    if (!factionFilters.length) return "";
    return factionFilters.join(` ${i18n.t("common.or")} `);
  },
);

export const selectProviderChanges = createSelector(
  selectDeckFilters,
  (filters) => {
    const providerFilters = filters.provider;
    if (!providerFilters.length) return "";

    return providerFilters
      .map((val) => formatProviderName(val))
      .join(` ${i18n.t("common.or")} `);
  },
);

export const selectDeckFilterChanges = createSelector(
  selectCardsChanges,
  selectXpCostChanges,
  selectDeckPropertiesChanges,
  selectTagsChanges,
  selectDeckFactionChanges,
  selectProviderChanges,
  (...changes) => changes.some((c) => c),
);
