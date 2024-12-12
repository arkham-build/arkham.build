import type { Filter } from "@/utils/fp";

export type AssetFilter = {
  health: undefined | [number, number];
  sanity: undefined | [number, number];
  skillBoosts: string[];
  slots: string[];
  uses: string[];
  healthX: boolean;
};

export type CostFilter = {
  range: undefined | [number, number];
  even: boolean;
  odd: boolean;
  x: boolean;
  nocost: boolean;
};

export type LevelFilter = {
  range: undefined | [number, number];
  exceptional: boolean;
  nonexceptional: boolean;
  affordableOnly: undefined | boolean;
};

export type MultiselectFilter = string[];

export type OwnershipFilter = "unowned" | "owned" | "all";

export type PropertiesFilter = {
  bonded: boolean;
  customizable: boolean;
  exile: boolean;
  fast: boolean;
  multiClass: boolean;
  healsDamage: boolean;
  healsHorror: boolean;
  permanent: boolean;
  specialist: boolean;
  seal: boolean;
  succeedBy: boolean;
  unique: boolean;
  victory: boolean;
};

export type SubtypeFilter = {
  none: boolean;
  weakness: boolean;
  basicweakness: boolean;
};

export type SelectFilter = string | number | undefined;

export type SkillIconsFilter = {
  agility: number | undefined;
  combat: number | undefined;
  intellect: number | undefined;
  willpower: number | undefined;
  wild: number | undefined;
  any: number | undefined;
};

export type FilterMapping = {
  action: MultiselectFilter;
  asset: AssetFilter;
  cost: CostFilter;
  encounterSet: MultiselectFilter;
  faction: MultiselectFilter;
  investigator: SelectFilter;
  level: LevelFilter;
  ownership: OwnershipFilter;
  pack: MultiselectFilter;
  properties: PropertiesFilter;
  skillIcons: SkillIconsFilter;
  subtype: SubtypeFilter;
  tabooSet: SelectFilter;
  trait: MultiselectFilter;
  type: MultiselectFilter;
};

export type FilterKey = keyof FilterMapping;

export type FilterObject<K extends FilterKey> = {
  open: boolean;
  type: K;
  value: FilterMapping[K];
};

export type Search = {
  value: string;
  includeGameText: boolean;
  includeFlavor: boolean;
  includeBacks: boolean;
};

export type GroupingType =
  | "cost"
  | "cycle"
  | "encounter_set"
  | "faction"
  | "base_upgrades"
  | "level"
  | "pack"
  | "slot"
  | "subtype"
  | "type";

export type SortingType =
  | "position"
  | "name"
  | "level"
  | "cycle"
  | "faction"
  | "type"
  | "cost";

export type ViewMode = "compact" | "card-text" | "full-cards" | "scans";

export type List = {
  cardType: "player" | "encounter";
  display: {
    grouping: GroupingType[];
    sorting: SortingType[];
    viewMode: ViewMode;
  };
  filters: FilterKey[];
  filtersEnabled: boolean;
  filterValues: {
    [id: number]: FilterObject<FilterKey>;
  };
  key: string;
  // Filter that controls which duplicates (parallels, revised core) should be filtered for a list.
  // This has historically been part of the system filter, but was moved out to allow for more flexibility
  // when handling duplicates, i.e. keeping those in decks.
  // This needs to be configurable in order to show parallel investigators in the choose investigator list.
  duplicateFilter: Filter;
  // Applied before any kind of other filtering is applied to card list.
  systemFilter?: Filter;
  search: Search;
};

type Lists = {
  [key: string]: List;
};

export type ListsSlice = {
  activeList?: string;
  lists: Lists;

  changeList(value: string, path: string): void;

  addList(
    key: string,
    cardType: List["cardType"],
    initialValues?: Partial<Record<FilterKey, FilterMapping[FilterKey]>>,
  ): void;

  removeList(key: string): void;

  setFiltersEnabled(value: boolean): void;
  setListViewMode(value: ViewMode): void;

  setFilterValue<T>(id: number, payload: T): void;
  setFilterOpen(id: number, open: boolean): void;

  setActiveList(value: string | undefined): void;
  setSearchValue(value: string): void;
  setSearchFlag(flag: keyof Omit<Search, "value">, value: boolean): void;

  resetFilter(id: number): void;
  resetFilters(): void;
};
