import type { SkillKey } from "@/utils/constants";
import type { Filter } from "@/utils/fp";
import type { DecklistConfig } from "./settings.types";

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
};

export type LevelFilter = {
  range: undefined | [number, number];
};

export type MultiselectFilter = string[];

export type OwnershipFilter = "unowned" | "owned" | "all";

export type FanMadeContentFilter = "fan-made" | "official" | "all";

export type PropertiesFilter = {
  bonded: boolean;
  customizable: boolean;
  exceptional: boolean;
  exile: boolean;
  fast: boolean;
  healsDamage: boolean;
  healsHorror: boolean;
  multiClass: boolean;
  myriad: boolean;
  permanent: boolean;
  seal: boolean;
  specialist: boolean;
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

export type CardTypeFilter = "" | "player" | "encounter";

export type SkillIconsFilter = {
  agility: number | undefined;
  combat: number | undefined;
  intellect: number | undefined;
  willpower: number | undefined;
  wild: number | undefined;
  any: number | undefined;
};

export type HealthFilter = [number, number] | undefined;

export type SanityFilter = [number, number] | undefined;

export type InvestigatorSkillsFilter = Record<
  Exclude<SkillKey, "wild">,
  [number, number] | undefined
>;

type InvestigatorCardAccessFilter = string[] | undefined;

export type FilterMapping = {
  action: MultiselectFilter;
  asset: AssetFilter;
  card_type: CardTypeFilter;
  cost: CostFilter;
  cycle: MultiselectFilter;
  encounter_set: MultiselectFilter;
  faction: MultiselectFilter;
  fan_made_content: FanMadeContentFilter;
  health: HealthFilter;
  illustrator: MultiselectFilter;
  investigator: SelectFilter;
  investigator_card_access: InvestigatorCardAccessFilter;
  investigator_skills: InvestigatorSkillsFilter;
  level: LevelFilter;
  ownership: OwnershipFilter;
  pack: MultiselectFilter;
  properties: PropertiesFilter;
  sanity: SanityFilter;
  skill_icons: SkillIconsFilter;
  subtype: SubtypeFilter;
  taboo_set: SelectFilter;
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
  buildQlError?: Error;
  buildQlSearch?: Filter;
  includeBacks: boolean;
  includeFlavor: boolean;
  includeGameText: boolean;
  includeName: boolean;
  mode: "buildql" | "simple";
  value: string;
};

export type GroupingType =
  | "base_upgrades"
  | "cost"
  | "cycle"
  | "encounter_set"
  | "faction"
  | "level"
  | "none"
  | "pack"
  | "slot"
  | "subtype"
  | "type";

export type SortingType =
  | "cost"
  | "cycle"
  | "faction"
  | "level"
  | "name"
  | "position"
  | "slot"
  | "subtype"
  | "type";

export type ViewMode =
  | "compact"
  | "card-text"
  | "full-cards"
  | "scans"
  | "scans-grouped";

export type ListDisplay = {
  grouping: GroupingType[];
  properties?: string[];
  sorting: SortingType[];
  viewMode: ViewMode;
};

export type List = {
  display: ListDisplay;
  initialDisplay: Pick<ListDisplay, "grouping" | "sorting" | "viewMode">;
  displaySortSelection: string;
  filters: FilterKey[];
  filtersEnabled: boolean;
  filterValues: {
    [id: number]: FilterObject<FilterKey>;
  };
  key: string;
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

  addList(
    key: string,
    initialValues?: Partial<Record<FilterKey, FilterMapping[FilterKey]>>,
    opts?: {
      showOwnershipFilter?: boolean;
      showInvestigatorFilter?: boolean;
      search?: string;
      additionalFilters?: FilterKey[];
    },
  ): void;

  removeList(key: string): void;

  setFiltersEnabled(value: boolean): void;
  setListViewMode(value: ViewMode): void;
  setListSort(value: DecklistConfig | undefined): void;

  setFilterValue<T>(id: number, payload: T): void;
  setFilterOpen(id: number, open: boolean): void;

  setActiveList(value: string | undefined): void;
  setSearchValue(value: string): void;
  setSearchFlag(flag: keyof Omit<Search, "value">, value: boolean): void;

  resetFilter(id: number): void;
  resetFilters(): void;
};
