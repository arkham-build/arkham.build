import {
  cardLevel,
  cardUses,
  isSpecialist,
  splitMultiValue,
} from "@/utils/card-utils";
import type { SkillKey } from "@/utils/constants";
import {
  NO_SLOT_STRING,
  REGEX_BONDED,
  SKILL_KEYS,
  SPECIAL_CARD_CODES,
  TAG_REGEX_FALLBACKS,
} from "@/utils/constants";
import { capitalize } from "@/utils/formatting";
import type { Filter } from "@/utils/fp";
import { and, not, notUnless, or } from "@/utils/fp";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import type { Card, DeckOption } from "../services/queries.types";
import type {
  AssetFilter,
  CostFilter,
  InvestigatorSkillsFilter,
  LevelFilter,
  MultiselectFilter,
  PropertiesFilter,
  SkillIconsFilter,
  SubtypeFilter,
} from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import { ownedCardCount } from "./card-ownership";
import type { LookupTables } from "./lookup-tables.types";
import type { SealedDeck, Selections } from "./types";
import { isOptionSelect } from "./types";

/**
 * Misc.
 */

export function filterDuplicates(card: Card) {
  return (
    (!card.hidden || card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) && // filter hidden cards (usually backsides)
    !card.alt_art_investigator && // filter novellas && parallel investigators
    !card.duplicate_of_code // filter revised_code.
  );
}

export function filterAlternates(card: Card) {
  return filterDuplicates(card) || !!card.parallel;
}

export function filterEncounterCards(card: Card) {
  return !!card.encounter_code; // filter out encounter cards (story player cards).
}

// needs to filter out some bad data that would otherwise end up in player cards (i.e. 04325).
export function filterMythosCards(card: Card) {
  return card.faction_code !== "mythos";
}

export function filterBacksides(card: Card) {
  return !card.linked;
}

export function filterPreviews(card: Card) {
  return !!card.preview;
}

export function filterOfficial(card: Card) {
  return !!card.official;
}

/**
 * Actions
 */

export function filterActions(
  filterState: MultiselectFilter,
  actionTable: LookupTables["actions"],
) {
  const filters: Filter[] = [];

  for (const key of filterState) {
    filters.push((c: Card) => !!actionTable[key][c.code]);
  }

  return or(filters);
}

/**
 * Asset
 */

function filterUses(uses: string) {
  return (card: Card) => cardUses(card) === uses;
}

function filterSkillBoost(
  skillBoost: string,
  skillBoostsTable: LookupTables["skillBoosts"],
) {
  return (card: Card) => !!skillBoostsTable[skillBoost]?.[card.code];
}

function filterSlots(slot: string) {
  return (card: Card) => {
    return slot === NO_SLOT_STRING
      ? card.type_code === "asset" && !card.real_slot
      : !!card.real_slot?.includes(slot);
  };
}

export function filterHealthProp(
  minMax: [number, number],
  healthX: boolean,
  key: "health" | "sanity",
) {
  return (card: Card) => {
    if (card.health === -2) return healthX;
    const health = card[key] ?? 0;
    return health >= minMax[0] && health <= minMax[1];
  };
}

export function filterAssets(value: AssetFilter, lookupTables: LookupTables) {
  const filters: Filter[] = [];

  if (value.health) {
    filters.push(filterHealthProp(value.health, value.healthX, "health"));
  }

  if (value.sanity) {
    filters.push(filterHealthProp(value.sanity, value.healthX, "sanity"));
  }

  if (value.skillBoosts.length) {
    const skillBoostFilters: Filter[] = value.skillBoosts.map((key) =>
      filterSkillBoost(key, lookupTables.skillBoosts),
    );
    filters.push(or(skillBoostFilters));
  }

  if (value.uses.length) {
    const usesFilters: Filter[] = value.uses.map((key) => filterUses(key));
    filters.push(or(usesFilters));
  }

  if (value.slots.length) {
    const slotFilters: Filter[] = value.slots.map(filterSlots);
    filters.push(or(slotFilters));
  }

  return filters.length ? and(filters) : undefined;
}

/**
 * Cost
 */

function filterEvenCost(card: Card) {
  return card.cost != null && card.cost % 2 === 0;
}

function filterOddCost(card: Card) {
  return card.cost != null && card.cost % 2 !== 0;
}

function filterXCost(card: Card) {
  return card.cost === -2;
}

function filterCardCost(value: [number, number]) {
  return (card: Card) => {
    const cost = card.cost == null ? -1 : card.cost;
    return cost >= value[0] && cost <= value[1];
  };
}

export function filterCost(filterState: CostFilter) {
  // apply level range if provided. `0-5` is assumed, null-costed cards are excluded.
  const filters = [];

  if (filterState.range) {
    filters.push(filterCardCost(filterState.range));
  }

  // apply even / odd filters
  const moduloFilters = [];

  if (filterState.even) moduloFilters.push(filterEvenCost);
  if (filterState.odd) moduloFilters.push(filterOddCost);

  filters.push(or(moduloFilters));

  const altCostFilters = [];

  if (filterState.x) altCostFilters.push(filterXCost);

  return or([...altCostFilters, and(filters)]);
}

/**
 * Encounter Set
 */

export function filterEncounterCode(filterState: MultiselectFilter) {
  const filters: Filter[] = [];

  for (const key of filterState) {
    filters.push((c: Card) => c.encounter_code === key);
  }

  return or(filters);
}

/**
 * Factions
 */

function filterMulticlass(card: Card) {
  return !!card.faction2_code;
}

function filterFaction(faction: string) {
  return (card: Card) =>
    card.faction_code === faction ||
    (!!card.faction2_code && card.faction2_code === faction) ||
    (!!card.faction3_code && card.faction3_code === faction);
}

export function filterFactions(factions: string[]) {
  const ands: Filter[] = [];
  const ors: Filter[] = [];

  for (const faction of factions) {
    if (faction === "multiclass") {
      ands.push(filterMulticlass);
    } else {
      ors.push(filterFaction(faction));
    }
  }

  return and([or(ors), ...ands]);
}

/**
 * Level
 */

function filterExceptional(card: Card) {
  return !!card.exceptional;
}

function filterNonexceptional(card: Card) {
  return !card.exceptional;
}

function isLevelInRange(
  level: number | null | undefined,
  value: [number, number],
) {
  const filters = [];

  // convention: -1 means "null" (i.e. no level).
  if (value[0] === -1) {
    filters.push(level == null);
  }

  if (level != null && value[1] !== -1) {
    filters.push(level >= value[0] && level <= value[1]);
  }

  return filters.some((x) => x);
}

function checkLevelRange(value: [number, number], card: Card, filter?: Filter) {
  return range(value[0], Math.max(value[1], 1)).some(
    (level) =>
      isLevelInRange(level, value) &&
      filter?.({ ...card, xp: level, customization_xp: 0 }),
  );
}

type FilterCardLevelOptions = {
  customizable?: CustomizableFilterOptions;
  investigator?: Card;
  targetDeck?: "slots" | "extraSlots" | "both";
};

function filterCardLevel(
  value: [number, number],
  options?: FilterCardLevelOptions,
) {
  return (card: Card) => {
    const level = cardLevel(card);

    if (
      !card.customization_options ||
      options?.customizable?.level === "actual"
    ) {
      return isLevelInRange(level, value);
    }

    if (!options?.investigator) {
      return value[1] >= 0;
    }

    const filter = filterInvestigatorAccess(options.investigator, {
      customizable: {
        level: "actual",
        properties: "all",
      },
      targetDeck: options.targetDeck,
    });

    return checkLevelRange(value, card, filter);
  };
}

export function filterLevel(filterState: LevelFilter, investigator?: Card) {
  const filters = [];

  if (filterState.range) {
    filters.push(
      filterCardLevel(filterState.range, {
        investigator,
        customizable: {
          level: "all",
          properties: "all",
        },
      }),
    );
  }

  if (filterState.exceptional !== filterState.nonexceptional) {
    if (filterState.exceptional) {
      filters.push(filterExceptional);
    } else {
      filters.push(filterNonexceptional);
    }
  }

  return and(filters);
}

/**
 * Ownership
 */

export function filterOwnership(
  card: Card,
  metadata: Metadata,
  lookupTables: LookupTables,
  collection: Record<string, number | boolean>,
  showAllCards: boolean,
) {
  return (
    ownedCardCount(card, metadata, lookupTables, collection, showAllCards) > 0
  );
}

/**
 * Pack Code
 */

export function filterPackCode(
  value: MultiselectFilter,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  if (isEmpty(value)) return undefined;

  const active = Object.values(value).some((x) => x);
  if (!active) return undefined;

  const filterValue = value.reduce<Record<string, boolean>>((acc, curr) => {
    acc[curr] = true;
    return acc;
  }, {});

  return (card: Card) =>
    filterOwnership(card, metadata, lookupTables, filterValue, false);
}

/**
 * Illustrator
 */
export function filterIllustrator(filterState: MultiselectFilter) {
  const filters: Filter[] = [];

  for (const key of filterState) {
    filters.push(
      (c: Card) => c.illustrator === key || c.back_illustrator === key,
    );
  }

  return or(filters);
}

/**
 * Properties
 */

function filterBonded(card: Card) {
  const firstLine = card.real_text?.split("\n").at(0);
  return !!firstLine && REGEX_BONDED.test(firstLine);
}

function filterCustomizable(card: Card) {
  return !!card.customization_options;
}

function filterExile(card: Card) {
  return !!card.exile;
}

function filterFast(fastTable: LookupTables["properties"]["fast"]) {
  return (card: Card) => !!fastTable[card.code];
}

function filterUnique(card: Card) {
  return !!card.is_unique;
}

function filterVictory(card: Card) {
  return !!card.victory;
}

function filterSeal(card: Card) {
  return !!card.tags?.includes("se");
}

function filterPermanent(card: Card) {
  return !!card.permanent;
}

function filterSucceedBy(
  succeedByTable: LookupTables["properties"]["succeedBy"],
) {
  return (card: Card) => !!succeedByTable[card.code];
}

export function filterTag(tag: string, checkUnselectedCustomizations: boolean) {
  return (card: Card) => {
    if (!card.official) {
      return filterTagFallback(tag, checkUnselectedCustomizations)(card);
    }

    const hasTag = !!card.tags?.includes(tag);

    if (
      hasTag ||
      !checkUnselectedCustomizations ||
      !card.customization_options
    ) {
      return hasTag;
    }

    return !!card.customization_options?.some((o) => o.tags?.includes(tag));
  };
}

export function filterTagFallback(
  tag: string,
  checkUnselectedCustomizations: boolean,
) {
  return (card: Card) => {
    const fallback = TAG_REGEX_FALLBACKS[tag];
    if (!fallback) return false;

    const textMatches =
      !!card.real_text?.match(fallback) ||
      !!card.real_back_text?.match(fallback);

    if (
      textMatches ||
      !checkUnselectedCustomizations ||
      !card.customization_options
    ) {
      return textMatches;
    }

    return !!card.real_customization_text?.match(fallback);
  };
}

function filterHealsDamage(checkUnselectedCustomizations: boolean) {
  return filterTag("hd", checkUnselectedCustomizations);
}

function filterHealsHorror(checkUnselectedCustomizations: boolean) {
  return filterTag("hh", checkUnselectedCustomizations);
}

/**
 * Restrictions
 */

function filterRestrictions(card: Card, investigator: Card) {
  if (Array.isArray(card.restrictions?.trait)) {
    const targetTraits = card.restrictions.trait;

    return splitMultiValue(investigator.real_traits).some((t) =>
      targetTraits.includes(t.toLowerCase()),
    );
  }

  return true;
}

export function filterProperties(
  filterState: PropertiesFilter,
  lookupTables: LookupTables,
) {
  const filters: Filter[] = [];

  if (filterState.bonded) {
    filters.push(filterBonded);
  }

  if (filterState.customizable) {
    filters.push(filterCustomizable);
  }

  if (filterState.exile) {
    filters.push(filterExile);
  }

  if (filterState.fast) {
    filters.push(filterFast(lookupTables.properties.fast));
  }

  if (filterState.unique) {
    filters.push(filterUnique);
  }

  if (filterState.permanent) {
    filters.push(filterPermanent);
  }

  if (filterState.seal) {
    filters.push(filterSeal);
  }

  if (filterState.victory) {
    filters.push(filterVictory);
  }

  if (filterState.healsDamage) {
    filters.push(filterHealsDamage(true));
  }

  if (filterState.healsHorror) {
    filters.push(filterHealsHorror(true));
  }

  if (filterState.succeedBy) {
    filters.push(filterSucceedBy(lookupTables.properties.succeedBy));
  }

  if (filterState.specialist) {
    filters.push(isSpecialist);
  }

  if (filterState.multiClass) {
    filters.push(filterMulticlass);
  }

  return and(filters);
}

/**
 * Skill Icons
 */

function filterSkill(skill: SkillKey, amount: number) {
  return (card: Card) =>
    card.type_code !== "investigator" &&
    (card[`skill_${skill}`] ?? 0) >= amount;
}

function filterSkillRange(skill: SkillKey, range: [number, number]) {
  return (card: Card) =>
    (card[`skill_${skill}`] ?? 0) >= range[0] &&
    (card[`skill_${skill}`] ?? 0) <= range[1];
}

export function filterSkillIcons(filterState: SkillIconsFilter) {
  const iconFilter: Filter[] = [];
  const anyFilter: Filter[] = [];

  const anyValue = filterState.any;

  for (const skill of SKILL_KEYS) {
    const value = filterState[skill];

    if (value) {
      iconFilter.push(filterSkill(skill, value));
    } else if (anyValue) {
      anyFilter.push(filterSkill(skill, anyValue));
    }
  }

  const filter = anyFilter.length
    ? and([or(anyFilter), and(iconFilter)])
    : and(iconFilter);

  return filter;
}

export function filterInvestigatorSkills(
  filterState: InvestigatorSkillsFilter,
) {
  const filters = Object.entries(filterState).reduce((acc, [skill, value]) => {
    if (!value) return acc;
    acc.push(filterSkillRange(skill as SkillKey, value));
    return acc;
  }, [] as Filter[]);

  return and(filters);
}

/**
 * Subtype
 */

export function filterSubtypes(filter: SubtypeFilter) {
  return (card: Card) => {
    return (
      (!!card.subtype_code &&
        filter[card.subtype_code as keyof SubtypeFilter]) ||
      (!card.subtype_code && filter["none"])
    );
  };
}

/**
 * Taboo Set
 */

export function filterTabooSet(tabooSetId: number, metadata: Metadata) {
  return (card: Card) => !!metadata.taboos[`${card.code}-${tabooSetId}`];
}

/**
 * Text
 */

function filterTextExact(text: string) {
  return (card: Card) => {
    return !!(
      card.real_text?.includes(text) ||
      card.real_customization_text?.includes(text)
    );
  };
}

function filterText(regex: string) {
  try {
    const re = new RegExp(regex);

    return (card: Card) => {
      return (
        !!card.real_customization_text?.match(re) ||
        !!card.real_back_text?.match(re) ||
        !!card.real_text?.match(re)
      );
    };
  } catch {
    console.error("invalid regex, ignoring deck_option:", regex);
    return () => true;
  }
}

/**
 * Trait
 */

export function filterTraits(
  filterState: MultiselectFilter,
  includeUnselectedCustomizationTraits?: boolean,
) {
  const filters: Filter[] = [];

  for (const key of filterState) {
    filters.push((card: Card) => {
      const hasTrait = !!card.real_traits?.includes(key);

      if (
        hasTrait ||
        !card.customization_options ||
        !includeUnselectedCustomizationTraits
      ) {
        return hasTrait;
      }

      return !!card.customization_options?.some((o) =>
        o.real_traits?.includes(key),
      );
    });
  }

  return or(filters);
}

/**
 * Type
 */

export function filterType(enabledTypeCodes: MultiselectFilter) {
  return (card: Card) => enabledTypeCodes.includes(card.type_code);
}

/**
 * Investigator access
 */

function filterRequired(investigator: Card) {
  return (card: Card) => {
    if (!card.restrictions?.investigator) return false;

    return (
      !!card.restrictions.investigator[investigator.code] ||
      (!!investigator.duplicate_of_code &&
        !!card.restrictions.investigator[investigator.duplicate_of_code]) ||
      (!!investigator.alternate_of_code &&
        !!card.restrictions.investigator[investigator.alternate_of_code])
    );
  };
}

// Customizable options can alter whether an investigator has access to a card.
// Example: a card gains a trait, or the option to heal horror.
// Example: checking options alters the card's level.
//  -> when showing options, we want to show these cards if an investigator has access to at least one possible configuration of the card.
//  -> when validating decks, we only consider the currently applied customizations.
type CustomizableFilterOptions = {
  level: "actual" | "all";
  properties: "actual" | "all";
};

export type InvestigatorAccessConfig = {
  additionalDeckOptions?: DeckOption[];
  customizable?: CustomizableFilterOptions;
  // Some || investigators have different traits on their front.
  // In order for trait-based access like specialist to work, we need to consider both sides.
  investigatorFront?: Card;
  selections?: Selections;
  showLimitedAccess?: boolean;
  targetDeck?: "slots" | "extraSlots" | "both";
};

export function makeOptionFilter(
  option: DeckOption,
  config?: InvestigatorAccessConfig,
) {
  // unknown rules or duplicate rules.
  if (
    option.deck_size_select ||
    option.tag?.includes("st") ||
    option.tag?.includes("uc")
  ) {
    return undefined;
  }

  const optionFilter = [];

  let filterCount = 0;

  if (option.not) {
    filterCount += 1;
  }

  if (option.limit) {
    filterCount += 1;
  }

  if (option.faction) {
    filterCount += 1;
    optionFilter.push(filterFactions(option.faction));
  }

  if (option.faction_select) {
    filterCount += 1;

    const targetKey = option.id ?? "faction_selected";

    const selection = config?.selections?.[targetKey]?.value;

    optionFilter.push(
      typeof selection === "string"
        ? filterFactions([selection])
        : filterFactions(option.faction_select),
    );
  }

  if (option.base_level || option.level) {
    const level = option.base_level ?? option.level;
    if (level) {
      filterCount += 1;
      optionFilter.push(
        filterCardLevel([level.min, level.max], {
          customizable: config?.customizable,
        }),
      );
    }
  }

  if (option.permanent) {
    optionFilter.push(filterPermanent);
    // explicit `false` means "forbidden", absence of `permanent` means "either allowed".
  } else if (option.permanent === false) {
    optionFilter.push(not(filterPermanent));
  }

  if (option.trait) {
    filterCount += 1;

    optionFilter.push(
      filterTraits(
        // traits are stored lowercased for whatever reason.
        option.trait.map(capitalize),
        config?.customizable?.properties === "all",
      ),
    );
  }

  if (option.uses) {
    filterCount += 1;

    const usesFilters: Filter[] = [];

    for (const uses of option.uses) {
      usesFilters.push(filterUses(uses));
    }

    optionFilter.push(or(usesFilters));
  }

  if (option.type) {
    filterCount += 1;
    optionFilter.push(filterType(option.type));
  }

  // parallel wendy + marion
  if (option.option_select) {
    const selectFilters: Filter[] = [];

    let selection = config?.selections?.["option_selected"]?.value;
    selection = isOptionSelect(selection) ? selection.id : undefined;

    for (const select of option.option_select) {
      if (selection && select.id !== selection) {
        continue;
      }

      const optionSelectFilters: Filter[] = [];

      if (select.level) {
        optionSelectFilters.push(
          filterCardLevel([select.level.min, select.level.max], {
            customizable: config?.customizable,
          }),
        );
      }

      if (select.trait) {
        optionSelectFilters.push(filterTraits(select.trait.map(capitalize)));
      }

      if (select.type) {
        optionSelectFilters.push(filterType(select.type));
      }

      selectFilters.push(and(optionSelectFilters));
    }

    filterCount += selectFilters.length + 1;
    optionFilter.push(or(selectFilters));
  }

  // tag-based access
  if (option.tag?.length) {
    filterCount += 1;
    const ors: Filter[] = [];

    for (const tag of option.tag) {
      ors.push(filterTag(tag, config?.customizable?.properties === "all"));
    }

    optionFilter.push(or(ors));
  }

  // text-based access
  if (option.text && !option.tag?.length) {
    filterCount += 1;
    const ors: Filter[] = [];

    for (const text of option.text) {
      ors.push(filterText(text));
    }

    optionFilter.push(or(ors));
  }

  if (option.text_exact && !option.tag?.length) {
    filterCount += 1;
    const ors: Filter[] = [];

    for (const text of option.text_exact) {
      ors.push(filterTextExact(text));
    }

    optionFilter.push(or(ors));
  }

  // on your own
  if (option.slot) {
    filterCount += 1;
    for (const slot of option.slot) {
      optionFilter.push(filterSlots(slot));
    }
  }

  if (filterCount <= 1) {
    console.debug("unknown deck requirement", option);
  }

  return filterCount > 1 ? and(optionFilter) : undefined;
}

export function filterInvestigatorAccess(
  investigatorBack: Card,
  config?: InvestigatorAccessConfig,
): Filter | undefined {
  const mode = config?.targetDeck ?? "slots";

  let investigator = investigatorBack;
  if (
    config?.investigatorFront &&
    config.investigatorFront.code !== investigatorBack.code
  ) {
    investigator = {
      ...investigatorBack,
      real_traits: config.investigatorFront.real_traits,
    };
  }

  const deckFilter =
    mode !== "extraSlots"
      ? makePlayerCardsFilter(
          investigator,
          "deck_options",
          "deck_requirements",
          config,
        )
      : undefined;

  const extraDeckFilter =
    mode !== "slots"
      ? makePlayerCardsFilter(
          investigator,
          "side_deck_options",
          "side_deck_requirements",
          config,
        )
      : undefined;

  if (mode !== "extraSlots" && !deckFilter) {
    console.warn(
      `filter is a noop: ${investigator.code} is not an investigator.`,
    );
  }

  if (mode === "slots") return deckFilter;
  if (mode === "extraSlots") return extraDeckFilter;

  const filters = [];

  if (deckFilter) filters.push(deckFilter);
  if (extraDeckFilter) filters.push(extraDeckFilter);
  return or(filters);
}

function makePlayerCardsFilter(
  investigator: Card,
  optionsAccessor: "deck_options" | "side_deck_options",
  requiredAccessor: "deck_requirements" | "side_deck_requirements",
  config?: InvestigatorAccessConfig,
) {
  let options = investigator[optionsAccessor];
  const requirements = investigator[requiredAccessor]?.card;

  if (!requirements || !options) {
    return undefined;
  }

  // normalize parallel investigators to root for lookups.
  const code = investigator.alternate_of_code ?? investigator.code;

  // special case: suzi's additional deck options allow any xp card.
  if (code === SPECIAL_CARD_CODES.SUZI) {
    options = [...options];
    options.splice(1, 0, {
      level: { max: 5, min: 0 },
      faction: ["neutral", "guardian", "mystic", "rogue", "seeker", "survivor"],
    });
  }

  const ands: Filter[] = [
    (card: Card) => filterRestrictions(card, investigator),
    not(filterType(["investigator", "location", "story"])),
  ];

  const ors: Filter[] = [];

  if (config?.targetDeck === "extraSlots") {
    ors.push((card: Card) => card.code in requirements);
  } else {
    ors.push(
      filterRequired(investigator),
      (card: Card) => card.subtype_code === "basicweakness",
      (card: Card) =>
        !!card.encounter_code &&
        !!card.deck_limit &&
        !card.back_link_id &&
        !card.double_sided &&
        card.faction_code !== "mythos",
    );
  }

  const showLimitedAccess = config?.showLimitedAccess ?? true;

  const filters: Filter[] = [];

  for (const option of options) {
    const filter =
      !option.limit || showLimitedAccess
        ? makeOptionFilter(option, config)
        : () => false;

    if (!filter) continue;

    if (option.not) {
      // When encountering a NOT, every filter that comes before can be considered an "unless".
      ands.push(filters.length ? notUnless(filter, [...filters]) : not(filter));
    } else {
      filters.push(filter);
    }
  }

  ors.push(...filters);

  if (config?.targetDeck !== "extraSlots" && config?.additionalDeckOptions) {
    for (const option of config.additionalDeckOptions) {
      const filter =
        !option.limit || showLimitedAccess
          ? makeOptionFilter(option, config)
          : () => false;

      if (!filter) continue;

      if (option.not) {
        ands.push(not(filter));
      } else {
        ors.push(filter);
      }
    }
  }

  return and([or(ors), ...ands]);
}

export function filterInvestigatorWeaknessAccess(
  investigator: Card,
  config?: Pick<InvestigatorAccessConfig, "targetDeck">,
) {
  const ors: Filter[] =
    config?.targetDeck !== "extraSlots"
      ? [
          filterRequired(investigator),
          filterSubtypes({ basicweakness: true, weakness: false, none: false }),
          (card: Card) => card.xp == null && !card.restrictions,
        ]
      : [(c: Card) => !!investigator.side_deck_requirements?.card?.[c.code]];

  return and([
    filterSubtypes({ basicweakness: true, weakness: true, none: false }),
    not(filterBonded),
    or(ors),
  ]);
}

export function filterSealed(
  sealedDeck: SealedDeck["cards"],
  lookupTables: LookupTables,
) {
  return (c: Card) => {
    if (sealedDeck[c.code]) return true;

    const duplicates = lookupTables.relations.duplicates[c.code];
    if (!duplicates) return false;

    return Object.keys(duplicates).some((code) => !!sealedDeck[code]);
  };
}
