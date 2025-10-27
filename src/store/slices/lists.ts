import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import type { Filter } from "@/utils/fp";
import { and, not } from "@/utils/fp";
import {
  filterBacksides,
  filterDuplicates,
  filterEncounterCards,
  filterPreviews,
  filterType,
} from "../lib/filtering";
import type { StoreState } from ".";
import {
  isAssetFilter,
  isCardTypeFilter,
  isCostFilter,
  isFanMadeContentFilter,
  isInvestigatorSkillsFilter,
  isLevelFilter,
  isMultiSelectFilter,
  isOwnershipFilter,
  isPropertiesFilter,
  isRangeFilter,
  isSkillIconsFilter,
  isSubtypeFilter,
} from "./lists.type-guards";
import type {
  AssetFilter,
  CostFilter,
  FanMadeContentFilter,
  FilterKey,
  FilterMapping,
  LevelFilter,
  List,
  ListsSlice,
  OwnershipFilter,
  PropertiesFilter,
  Search,
  SkillIconsFilter,
  SubtypeFilter,
} from "./lists.types";
import type { SettingsState } from "./settings.types";

function getInitialList() {
  if (window.location.href.includes("/deck/create")) {
    return "create_deck";
  }

  if (window.location.href.includes("/deck/")) {
    return "editor";
  }

  return "browse";
}

export const createListsSlice: StateCreator<StoreState, [], [], ListsSlice> = (
  set,
) => ({
  activeList: getInitialList(),
  lists: {},

  resetFilters() {
    set((state) => {
      const activeList = state.activeList;
      assert(activeList, "no active list is defined.");

      const list = state.lists[activeList];
      assert(list, `list ${activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [activeList]: makeList({
            ...list,
            initialValues: mergeInitialValues({}, state.settings),
          }),
        },
      };
    });
  },

  resetFilter(id) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      filterValues[id] = makeFilterValue(filterValues[id].type);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setActiveList(value) {
    if (value == null) {
      set({ activeList: undefined });
    } else {
      set((state) => {
        assert(state.lists[value], `list ${value} not defined.`);
        return { activeList: value };
      });
    }
  },

  setFilterOpen(id, open) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      filterValues[id] = { ...filterValues[id], open };

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setFilterValue(id, payload) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      switch (filterValues[id].type) {
        case "illustrator":
        case "action":
        case "encounter_set":
        case "trait":
        case "type":
        case "pack":
        case "faction": {
          assert(
            isMultiSelectFilter(payload),
            `filter ${id} value must be an array.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "card_type": {
          assert(
            isCardTypeFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };

          list.display = getDisplaySettings(
            Object.fromEntries(
              list.filters.map(
                (filter, i) => [filter, filterValues[i].value] as const,
              ),
            ),
            state.settings,
          );

          break;
        }

        case "cost": {
          const currentValue = filterValues[id].value as CostFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isCostFilter(value),
            `filter ${id} value must be a cost object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "fan_made_content": {
          assert(
            isFanMadeContentFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "level": {
          const currentValue = filterValues[id].value as LevelFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isLevelFilter(value),
            `filter ${id} value must be an level object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "ownership": {
          assert(
            isOwnershipFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "investigator": {
          assert(
            typeof payload === "string",
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "taboo_set": {
          filterValues[id] = {
            ...filterValues[id],
            value: payload as number | undefined,
          };
          break;
        }

        case "subtype": {
          const currentValue = filterValues[id].value as SubtypeFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isSubtypeFilter(value),
            `filter ${id} value must be a map of booleans.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "properties": {
          const currentValue = filterValues[id].value as PropertiesFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isPropertiesFilter(value),
            `filter ${id} value must be a map of booleans.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "asset": {
          const currentValue = filterValues[id].value as AssetFilter;
          const value = { ...currentValue, ...payload };
          assert(
            isAssetFilter(value),
            `filter ${id} value must be an asset object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "health":
        case "sanity": {
          assert(
            isRangeFilter(payload),
            `filter ${id} value must be an array of two numbers.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "skill_icons": {
          assert(
            isSkillIconsFilter(payload),
            `filter ${id} value must be an object.`,
          );
          const currentValue = filterValues[id].value as SkillIconsFilter;
          const value = { ...currentValue, ...payload };

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "investigator_skills": {
          assert(
            isInvestigatorSkillsFilter(payload),
            `filter ${id} value must be an object.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "investigator_card_access": {
          assert(
            isMultiSelectFilter(payload),
            `filter ${id} value must be an array.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }
      }

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setSearchFlag(flag, value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            search: {
              ...list.search,
              [flag]: value,
            },
          },
        },
      };
    });
  },

  setSearchValue(value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            search: {
              ...list.search,
              value,
            },
          },
        },
      };
    });
  },

  setFiltersEnabled(value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filtersEnabled: value,
          },
        },
      };
    });
  },

  setListViewMode(viewMode) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            display: {
              ...list.display,
              viewMode,
            },
          },
        },
      };
    });
  },

  addList(key, initialValues) {
    set((state) => {
      const lists = { ...state.lists };
      assert(!lists[key], `list ${key} already exists.`);

      const values = mergeInitialValues(initialValues ?? {}, state.settings);

      lists[key] = makeList({
        display: getDisplaySettings(values, state.settings),
        duplicateFilter: (c) => filterDuplicates(c) || !!c.parallel,
        filters: cardsFilters({
          additionalFilters: ["illustrator"],
          showOwnershipFilter: true,
          showInvestigatorsFilter: true,
        }),
        initialValues: values,
        key,
        systemFilter: filterBacksides,
      });

      return { lists };
    });
  },

  removeList(key) {
    set((state) => {
      const lists = { ...state.lists };
      delete lists[key];
      return { lists };
    });
  },
});

function makeSearch(): Search {
  return {
    value: "",
    includeBacks: false,
    includeFlavor: false,
    includeGameText: false,
    includeName: true,
  };
}

function makeFilterObject<K extends FilterKey>(
  type: K,
  value: FilterMapping[K],
  open = false,
) {
  return {
    open,
    type,
    value,
  };
}

function makeFilterValue(type: FilterKey, initialValue?: unknown) {
  switch (type) {
    case "asset": {
      return makeFilterObject(
        type,
        isAssetFilter(initialValue)
          ? initialValue
          : {
              health: undefined,
              sanity: undefined,
              skillBoosts: [],
              slots: [],
              uses: [],
              healthX: false,
            },
      );
    }

    case "card_type": {
      return makeFilterObject(
        type,
        isCardTypeFilter(initialValue) ? initialValue : "",
      );
    }

    case "cost": {
      return makeFilterObject(
        type,
        isCostFilter(initialValue)
          ? initialValue
          : {
              range: undefined,
              even: false,
              odd: false,
              x: false,
            },
      );
    }

    case "level": {
      return makeFilterObject(
        type,
        isLevelFilter(initialValue)
          ? initialValue
          : {
              range: undefined,
              exceptional: false,
              nonexceptional: false,
            },
      );
    }

    case "health":
    case "sanity": {
      return makeFilterObject(
        type,
        isRangeFilter(initialValue) ? initialValue : undefined,
      );
    }

    case "investigator_skills": {
      return makeFilterObject(
        type,
        isInvestigatorSkillsFilter(initialValue)
          ? initialValue
          : {
              agility: undefined,
              combat: undefined,
              intellect: undefined,
              willpower: undefined,
            },
      );
    }

    case "illustrator":
    case "investigator_card_access":
    case "action":
    case "encounter_set":
    case "pack":
    case "trait":
    case "type":
    case "faction": {
      return makeFilterObject(
        type,
        isMultiSelectFilter(initialValue) ? initialValue : [],
      );
    }

    case "subtype": {
      return makeFilterObject(
        type,
        isSubtypeFilter(initialValue)
          ? initialValue
          : {
              none: true,
              weakness: true,
              basicweakness: true,
            },
        !initialValue,
      );
    }

    case "ownership": {
      return makeFilterObject(
        type,
        isOwnershipFilter(initialValue) ? initialValue : "all",
      );
    }

    case "fan_made_content": {
      return makeFilterObject(
        type,
        isFanMadeContentFilter(initialValue) ? initialValue : "all",
      );
    }

    case "properties": {
      return makeFilterObject(
        type,
        isPropertiesFilter(initialValue)
          ? initialValue
          : {
              bonded: false,
              customizable: false,
              exile: false,
              fast: false,
              healsDamage: false,
              healsHorror: false,
              multiClass: false,
              permanent: false,
              seal: false,
              specialist: false,
              succeedBy: false,
              unique: false,
              victory: false,
            },
        true,
      );
    }

    case "investigator": {
      return makeFilterObject(
        type,
        typeof initialValue === "string" ? initialValue : undefined,
      );
    }

    case "taboo_set": {
      return makeFilterObject(
        type,
        typeof initialValue === "number" ? initialValue : undefined,
      );
    }

    case "skill_icons": {
      return makeFilterObject(
        "skill_icons",
        isSkillIconsFilter(initialValue)
          ? initialValue
          : {
              agility: undefined,
              combat: undefined,
              intellect: undefined,
              willpower: undefined,
              wild: undefined,
              any: undefined,
            },
      );
    }
  }
}

type MakeListOptions = {
  key: string;
  filters: FilterKey[];
  display: List["display"];
  duplicateFilter: Filter;
  systemFilter?: Filter;
  initialValues?: Partial<Record<FilterKey, unknown>>;
  search?: Search;
};

function makeList({
  key,
  filters,
  display,
  duplicateFilter,
  systemFilter,
  initialValues,
  search,
}: MakeListOptions): List {
  return {
    duplicateFilter,
    filters,
    filterValues: filters.reduce<List["filterValues"]>((acc, curr, i) => {
      acc[i] = makeFilterValue(curr, initialValues?.[curr]);
      return acc;
    }, {}),
    filtersEnabled: true,
    display,
    key,
    systemFilter,
    search: search ?? makeSearch(),
  };
}

function investigatorFilters({
  additionalFilters = [] as FilterKey[],
  showOwnershipFilter = false,
}) {
  const filters: FilterKey[] = ["faction", "investigator_skills"];

  if (showOwnershipFilter) {
    filters.push("ownership");
  }

  filters.push(
    "fan_made_content",
    "pack",
    "investigator_card_access",
    "trait",
    "health",
    "sanity",
    ...additionalFilters,
  );

  return filters;
}

function cardsFilters({
  additionalFilters = [] as FilterKey[],
  showOwnershipFilter = false,
  showInvestigatorsFilter = false,
}) {
  const filters: FilterKey[] = ["card_type", "faction", "type", "level"];

  if (showOwnershipFilter) {
    filters.push("ownership");
  }

  filters.push("fan_made_content");

  if (showInvestigatorsFilter) {
    filters.push("investigator");
  }

  filters.push(
    "subtype",
    "cost",
    "trait",
    "asset",
    "skill_icons",
    "properties",
    "action",
    "pack",
    "encounter_set",
    "taboo_set",
    ...additionalFilters,
  );

  return filters;
}

function properties() {
  return [
    "customizable",
    "exile",
    "fast",
    "healsDamage",
    "healsHorror",
    "multiClass",
    "permanent",
    "seal",
    "specialist",
    "succeedBy",
    "unique",
    "victory",
  ];
}

export function makeLists(
  settings: SettingsState,
  _initialValues?: Partial<Record<FilterKey, unknown>>,
) {
  const initialValues = mergeInitialValues(_initialValues ?? {}, settings);

  const systemFilters = [filterBacksides];

  if (!settings.showPreviews) {
    systemFilters.push(not(filterPreviews));
  }

  const systemFilter = and(systemFilters);

  return {
    browse: makeList({
      display: getDisplaySettings(initialValues, settings),
      duplicateFilter: (c) => filterDuplicates(c) || !!c.parallel,
      initialValues,
      key: "browse",
      systemFilter,
      filters: cardsFilters({
        additionalFilters: ["illustrator"],
        showOwnershipFilter: true,
        showInvestigatorsFilter: true,
      }),
    }),
    create_deck: makeList({
      display: {
        grouping: settings.lists.investigator.group,
        sorting: settings.lists.investigator.sort,
        viewMode: settings.lists.investigator.viewMode,
      },
      systemFilter: and([
        systemFilter,
        filterType(["investigator"]),
        not(filterEncounterCards),
      ]),
      duplicateFilter: (c) => filterDuplicates(c) || !!c.parallel,
      initialValues,
      key: "create_deck",
      filters: investigatorFilters({
        showOwnershipFilter: true,
      }),
    }),
    editor: makeList({
      display: getDisplaySettings(initialValues, settings),
      duplicateFilter: (c) => filterDuplicates(c) || !!c.parallel,
      initialValues,
      key: "editor",
      systemFilter,
      filters: cardsFilters({
        showOwnershipFilter: true,
        showInvestigatorsFilter: false,
      }),
    }),
  };
}

function mergeInitialValues(
  initialValues: Partial<Record<FilterKey, unknown>>,
  settings: SettingsState,
) {
  return {
    ...initialValues,
    card_type: "player",
    fan_made_content: getInitialFanMadeContentFilter(settings),
    ownership: getInitialOwnershipFilter(settings),
  };
}

function getInitialFanMadeContentFilter(
  settings: SettingsState,
): FanMadeContentFilter {
  return settings.cardListsDefaultContentType ?? "all";
}

function getInitialOwnershipFilter(settings: SettingsState): OwnershipFilter {
  return settings.showAllCards ? "all" : "owned";
}

function getDisplaySettings(
  values: Partial<Record<FilterKey, unknown>>,
  settings: SettingsState,
) {
  switch (values.card_type) {
    case "player": {
      return {
        grouping: settings.lists.player.group,
        sorting: settings.lists.player.sort,
        viewMode: settings.lists.player.viewMode,
        properties: properties(),
      };
    }

    case "encounter": {
      return {
        grouping: settings.lists.encounter.group,
        sorting: settings.lists.encounter.sort,
        viewMode: settings.lists.encounter.viewMode,
        properties: properties(),
      };
    }

    default: {
      return {
        grouping: settings.lists.mixed.group,
        sorting: settings.lists.mixed.sort,
        viewMode: settings.lists.mixed.viewMode,
        properties: properties(),
      };
    }
  }
}
