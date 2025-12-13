import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { DEFAULT_LIST_SORT_ID, SPECIAL_CARD_CODES } from "@/utils/constants";
import type { Filter } from "@/utils/fp";
import { and, not } from "@/utils/fp";
import { parse as parseBuildQl } from "../lib/buildql/parser";
import {
  filterBacksides,
  filterEncounterCards,
  filterPreviews,
  filterType,
} from "../lib/filtering";
import type { Card } from "../schemas/card.schema";
import { selectBuildQlInterpreter } from "../selectors/shared";
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
  ListDisplay,
  ListsSlice,
  OwnershipFilter,
  PropertiesFilter,
  Search,
  SkillIconsFilter,
  SubtypeFilter,
} from "./lists.types";
import type { DecklistConfig, SettingsState } from "./settings.types";

const SYSTEM_FILTERS: Filter[] = [
  filterBacksides,
  (card: Card) =>
    !card.hidden || card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
  // Bonded investigators
  (card: Card) =>
    card.type_code !== "investigator" ||
    !!card.deck_limit ||
    !!card.encounter_code,
];

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
  get,
) => ({
  activeList: getInitialList(),
  lists: {},

  resetFilters() {
    set((state) => {
      const activeList = state.activeList;
      assert(activeList, "no active list is defined.");

      const list = state.lists[activeList];
      assert(list, `list ${activeList} not defined.`);

      const initialValues = mergeInitialValues({}, state.settings);

      return {
        lists: {
          ...state.lists,
          [activeList]: makeList({
            ...list,
            display: getDisplaySettings(initialValues, state.settings),
            initialValues,
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

      let list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);
      list = { ...list };

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

          const nextDisplaySettings = getDisplaySettings(
            Object.fromEntries(
              list.filters.map(
                (filter, i) => [filter, filterValues[i].value] as const,
              ),
            ),
            state.settings,
          );

          list.initialDisplay = nextDisplaySettings;

          if (list.displaySortSelection === DEFAULT_LIST_SORT_ID) {
            list.displaySortSelection = DEFAULT_LIST_SORT_ID;

            list.display = {
              ...list.display,
              sorting: nextDisplaySettings.sorting,
              grouping: nextDisplaySettings.grouping,
            };
          }

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
    let state = get();

    assert(state.activeList, "no active list is defined.");
    const activeList = state.activeList;

    let list = state.lists[state.activeList];
    assert(list, `list ${state.activeList} not defined.`);

    set((state) => ({
      lists: {
        ...state.lists,
        [activeList]: {
          ...list,
          search: {
            ...list.search,
            [flag]: value,
          },
        },
      },
    }));

    if (list.search.mode === "buildql") {
      state = get();

      list = state.lists[activeList];
      assert(list, `list ${activeList} not defined.`);

      const interpreter = selectBuildQlInterpreter(state);

      let buildQlSearch: Filter | undefined;
      try {
        const filter = interpreter.evaluate(parseBuildQl(list.search.value));
        filter({} as Card);
        buildQlSearch = filter;
      } catch {}

      if (buildQlSearch) {
        set((state) => ({
          lists: {
            ...state.lists,
            [activeList]: {
              ...list,
              search: {
                ...list.search,
                buildQlSearch,
              },
            },
          },
        }));
      }
    }
  },

  setSearchValue(value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const interpreter = selectBuildQlInterpreter(state);

      let buildQlSearch: Filter | undefined;
      try {
        const filter = interpreter.evaluate(parseBuildQl(value));
        filter({} as Card);
        buildQlSearch = filter;
      } catch {}

      const isBuildQl =
        value && (list.search.mode === "buildql" || !!buildQlSearch);

      const mode = isBuildQl ? "buildql" : "simple";

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            search: {
              ...list.search,
              mode,
              buildQlSearch:
                isBuildQl && !buildQlSearch
                  ? list.search.buildQlSearch
                  : buildQlSearch,
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

  setListSort(config) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      let preset: Pick<ListDisplay, "grouping" | "sorting">;

      if (config) {
        preset = {
          sorting: config.sort,
          grouping: config.group,
        };
      } else {
        preset = {
          sorting: list.initialDisplay.sorting,
          grouping: list.initialDisplay.grouping,
        };
      }

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            display: {
              ...list.display,
              ...preset,
            },
            displaySortSelection: config
              ? sortPresetId(config)
              : DEFAULT_LIST_SORT_ID,
          },
        },
      };
    });
  },

  addList(
    key,
    initialValues,
    opts = {
      search: "",
      showOwnershipFilter: true,
      showInvestigatorFilter: true,
    },
  ) {
    set((state) => {
      const lists = { ...state.lists };

      const values = mergeInitialValues(initialValues ?? {}, state.settings);

      lists[key] = makeList({
        display: getDisplaySettings(values, state.settings),
        filters: cardsFilters({
          additionalFilters: ["illustrator"],
          showOwnershipFilter: opts.showOwnershipFilter,
          showInvestigatorsFilter: opts.showOwnershipFilter,
        }),
        initialValues: values,
        key,
        systemFilter: and([...SYSTEM_FILTERS]),
        search: {
          value: opts.search ?? "",
          mode: "simple",
          includeBacks: false,
          includeFlavor: false,
          includeGameText: false,
          includeName: true,
        },
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
    mode: "simple",
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
        false,
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
              exceptional: false,
              fast: false,
              healsDamage: false,
              healsHorror: false,
              multiClass: false,
              myriad: false,
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
  display: ListDisplay;
  systemFilter?: Filter;
  initialValues?: Partial<Record<FilterKey, unknown>>;
  search?: Search;
};

function makeList({
  key,
  filters,
  display,
  systemFilter,
  initialValues,
  search,
}: MakeListOptions): List {
  return {
    filters,
    filterValues: filters.reduce<List["filterValues"]>((acc, curr, i) => {
      acc[i] = makeFilterValue(curr, initialValues?.[curr]);
      return acc;
    }, {}),
    filtersEnabled: true,
    display,
    displaySortSelection: DEFAULT_LIST_SORT_ID,
    initialDisplay: display,
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
  const filters: FilterKey[] = [
    "card_type",
    "faction",
    "type",
    "level",
    "cost",
    "trait",
  ];

  if (showOwnershipFilter) {
    filters.push("ownership");
  }

  filters.push("fan_made_content");

  if (showInvestigatorsFilter) {
    filters.push("investigator");
  }

  filters.push(
    "asset",
    "skill_icons",
    "properties",
    "action",
    "subtype",
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
    "exceptional",
    "fast",
    "healsDamage",
    "healsHorror",
    "multiClass",
    "myriad",
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

  const systemFilters = [...SYSTEM_FILTERS];

  if (!settings.showPreviews) {
    systemFilters.push(not(filterPreviews));
  }

  const systemFilter = and(systemFilters);

  return {
    browse: makeList({
      display: getDisplaySettings(initialValues, settings),
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
      initialValues,
      key: "create_deck",
      filters: investigatorFilters({
        showOwnershipFilter: true,
      }),
    }),
    editor: makeList({
      display: getDisplaySettings(initialValues, settings),
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
    card_type: initialValues.card_type ?? "player",
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

export function sortPresetId(config: DecklistConfig): string {
  return [...config.group, ...config.sort].join("|");
}
