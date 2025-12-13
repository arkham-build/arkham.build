import { createSelector } from "reselect";
import {
  displayAttribute,
  official,
  splitMultiValue,
} from "@/utils/card-utils";
import {
  ASSET_SLOT_ORDER,
  CYCLES_WITH_STANDALONE_PACKS,
  FACTION_ORDER,
  type FactionName,
  NO_SLOT_STRING,
  SKILL_KEYS,
  type SkillKey,
  SPECIAL_CARD_CODES,
} from "@/utils/constants";
import { resolveLimitedPoolPacks } from "@/utils/environments";
import {
  capitalize,
  displayPackName,
  formatTabooSet,
} from "@/utils/formatting";
import type { Filter } from "@/utils/fp";
import { and, not, or } from "@/utils/fp";
import i18n from "@/utils/i18n";
import { isEmpty } from "@/utils/is-empty";
import { time, timeEnd } from "@/utils/time";
import { applyCardChanges } from "../lib/card-edits";
import { getAdditionalDeckOptions } from "../lib/deck-validation";
import {
  containsCard,
  filterActions,
  filterAssets,
  filterBacksides,
  filterCardPool,
  filterCost,
  filterDuplicates,
  filterDuplicatesFromContext,
  filterEncounterCards,
  filterEncounterCode,
  filterFactions,
  filterHealthProp,
  filterIllustrator,
  filterInvestigatorAccess,
  filterInvestigatorSkills,
  filterInvestigatorWeaknessAccess,
  filterLevel,
  filterMythosCards,
  filterOfficial,
  filterOwnership,
  filterPackCode,
  filterProperties,
  filterSealed,
  filterSkillIcons,
  filterSubtypes,
  filterTabooSet,
  filterTraits,
  filterType,
} from "../lib/filtering";
import { getGroupedCards } from "../lib/grouping";
import type { LookupTables } from "../lib/lookup-tables.types";
import { resolveCardWithRelations } from "../lib/resolve-card";
import { applySearch } from "../lib/searching";
import {
  makeSortFunction,
  sortByEncounterSet,
  sortByName,
} from "../lib/sorting";
import { isResolvedDeck, type ResolvedDeck } from "../lib/types";
import type { Card } from "../schemas/card.schema";
import type { Cycle } from "../schemas/cycle.schema";
import type { Pack } from "../schemas/pack.schema";
import type { StoreState } from "../slices";
import type {
  AssetFilter,
  CardTypeFilter,
  CostFilter,
  FanMadeContentFilter,
  FilterMapping,
  HealthFilter,
  InvestigatorSkillsFilter,
  LevelFilter,
  List,
  MultiselectFilter,
  OwnershipFilter,
  PropertiesFilter,
  SanityFilter,
  SelectFilter,
  SkillIconsFilter,
  SubtypeFilter,
} from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import {
  selectActiveList,
  selectCollection,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectSettingsTabooId,
  selectTraitMapper,
} from "./shared";

export type CardGroup = {
  type: string;
  key: string;
};

export type ListState = {
  cards: Card[];
  groupCounts: number[];
  groups: CardGroup[];
  key: string;
  totalCardCount: number;
};

export type TargetDeck = "slots" | "extraSlots" | "both";

function makeUserFilter(
  metadata: Metadata,
  lookupTables: LookupTables,
  list: List,
  resolvedDeck: ResolvedDeck | undefined,
  targetDeck: TargetDeck | undefined,
) {
  const filters: Filter[] = [];

  if (!list.filtersEnabled) return and(filters);

  list.filters.forEach((_, id) => {
    const filterValue = list.filterValues[id];
    if (!filterValue) return;

    switch (filterValue.type) {
      case "action": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          filters.push(filterActions(value, lookupTables.actions));
        }
        break;
      }

      case "asset": {
        const value = filterValue.value as AssetFilter;
        const filter = filterAssets(value, lookupTables);
        if (filter) filters.push(filter);
        break;
      }

      case "cost": {
        const value = filterValue.value as CostFilter;
        if (value.range) filters.push(filterCost(value));
        break;
      }

      case "encounter_set": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) filters.push(filterEncounterCode(value));
        break;
      }

      case "faction": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) filters.push(filterFactions(value));
        break;
      }

      case "investigator": {
        const value = filterValue.value as string | undefined;

        if (value) {
          const filter = [];
          const accessFilter = filterInvestigatorAccess(metadata.cards[value], {
            customizable: {
              properties: "all",
              level: "all",
            },
            targetDeck,
          });
          const weaknessFilter = filterInvestigatorWeaknessAccess(
            metadata.cards[value],
            { targetDeck },
          );

          if (accessFilter) filter.push(accessFilter);
          if (weaknessFilter) filter.push(weaknessFilter);

          filters.push(or(filter));
        }

        break;
      }

      case "level": {
        const value = filterValue.value as LevelFilter;

        if (value.range) {
          if (resolvedDeck) {
            filters.push(
              filterLevel(value, resolvedDeck?.investigatorBack?.card),
            );
          } else {
            const filterIndex = list.filters.indexOf("investigator");
            const filterValue = filterIndex
              ? list.filterValues[filterIndex]?.value
              : undefined;
            const investigator = filterValue
              ? metadata.cards[filterValue as string]
              : undefined;
            filters.push(filterLevel(value, investigator));
          }
        }

        break;
      }

      case "pack": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterPackCode(value, lookupTables);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "properties": {
        const value = filterValue.value as PropertiesFilter;
        filters.push(filterProperties(value, lookupTables));
        break;
      }

      case "skill_icons": {
        const value = filterValue.value as SkillIconsFilter;
        filters.push(filterSkillIcons(value));
        break;
      }

      case "taboo_set": {
        const value = filterValue.value as number | undefined;
        if (value != null) filters.push(filterTabooSet(value, metadata));
        break;
      }

      case "trait": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) filters.push(filterTraits(value));
        break;
      }

      case "type": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) filters.push(filterType(value));
        break;
      }

      case "health":
      case "sanity": {
        const value = filterValue.value as [number, number] | undefined;
        if (value) {
          filters.push(filterHealthProp(value, false, filterValue.type));
        }
        break;
      }

      case "investigator_skills": {
        const value = filterValue.value as InvestigatorSkillsFilter;
        filters.push(filterInvestigatorSkills(value));
        break;
      }

      case "investigator_card_access": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = (card: Card) => {
            if (card.type_code !== "investigator") return false;

            const filter = filterInvestigatorAccess(card, {
              customizable: {
                properties: "all",
                level: "all",
              },
              targetDeck: "both",
            });

            if (!filter) return false;
            return value.every((code) => filter(metadata.cards[code]));
          };

          filters.push(filter);
        }
        break;
      }

      case "illustrator": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          filters.push(filterIllustrator(value));
        }

        break;
      }

      case "subtype": {
        const value = filterValue.value as SubtypeFilter;
        if (value) {
          filters.push(filterSubtypes(value));
        }
        break;
      }

      // These filters are handled in the "system" filter of the list since they should
      // be reflected in the choices available to the user.
      // For instance, it does not make sense to show weakness or non-collection card traits
      // as options in the trait filter.
      // TODO: At some point, we might want to refactor the store data structure to reflect this.
      case "fan_made_content":
      case "card_type":
      case "ownership": {
        break;
      }
    }
  });

  return filters.length ? and(filters) : undefined;
}

export const selectActiveListFilters = (state: StoreState) => {
  const active = selectActiveList(state);
  return active ? active.filters : [];
};

export const selectActiveListFilter = createSelector(
  selectActiveList,
  (_: StoreState, id: number) => id,
  (list, id) => {
    return list ? list.filterValues[id] : undefined;
  },
);

export function selectCanonicalTabooSetId(
  state: StoreState,
  resolvedDeck: ResolvedDeck | undefined,
) {
  if (resolvedDeck) return resolvedDeck.taboo_id;

  const filters = selectActiveListFilters(state);
  const filterId = filters.indexOf("taboo_set");

  const filterValue = filterId
    ? selectActiveListFilter(state, filterId)
    : undefined;

  if (typeof filterValue?.value === "number") return filterValue.value;

  return selectSettingsTabooId(state.settings, selectMetadata(state));
}

// Custom equality check for deck's card access.
// Deck access is only affected by a few subset of deck changes:
// 1. The deck changes.
// 2. The taboo that the deck uses changes.
// 3. An investigator side changes.
// 4. Cards that change deckbuilding rules (i.e. On Your Own, Versatile...) are added or removed.
// 5. Customizations change, some options change card properties.
// 6. Investigator option selections change.
// 7. Deck card pool changes.
// 8. Sealed deck changes.
// 9. Stored deck has changed.
const deckAccessEqual = (
  a: ResolvedDeck | undefined,
  b: ResolvedDeck | undefined,
) => {
  if (isResolvedDeck(a) && isResolvedDeck(b)) {
    return (
      a.id === b.id && // 1
      a.taboo_id === b.taboo_id && // 2
      a.investigatorFront.card.code === b.investigatorFront.card.code && // 3
      a.investigatorBack.card.code === b.investigatorBack.card.code && // 3
      JSON.stringify(getAdditionalDeckOptions(a)) ===
        JSON.stringify(getAdditionalDeckOptions(b)) && // 4
      JSON.stringify(a.customizations) === JSON.stringify(b.customizations) && // 5
      JSON.stringify(a.selections) === JSON.stringify(b.selections) && // 6
      JSON.stringify(a.cardPool) === JSON.stringify(b.cardPool) && // 7
      a.sealedDeck === b.sealedDeck && // 8
      a.date_update === b.date_update // 9
    );
  }

  // biome-ignore lint/suspicious/noDoubleEquals: we want a shallow equality check in this context.
  return a == b;
};

const selectDeckCachedByCardAccess = createSelector(
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (resolvedDeck) => resolvedDeck,
  {
    memoizeOptions: {
      resultEqualityCheck: deckAccessEqual,
    },
  },
);

const selectDeckInvestigatorFilter = createSelector(
  selectMetadata,
  selectLookupTables,
  selectDeckCachedByCardAccess,
  (state: StoreState) => state.settings,
  (
    _: StoreState,
    __: ResolvedDeck | undefined,
    targetDeck: TargetDeck | undefined,
  ) => targetDeck ?? "slots",
  (state: StoreState) => state.ui.showUnusableCards,
  (state: StoreState) => state.ui.showLimitedAccess,
  (
    metadata,
    lookupTables,
    resolvedDeck,
    settings,
    targetDeck,
    showUnusableCards,
    showLimitedAccess,
  ) => {
    if (!resolvedDeck) return undefined;

    const investigatorBack = resolvedDeck.investigatorBack.card;
    if (!investigatorBack) return undefined;

    if (showUnusableCards) {
      return and([
        not(filterType(["investigator", "story", "location"])),
        filterMythosCards,
        (card: Card) =>
          !lookupTables.relations.bonded[card.code] &&
          (card?.xp != null ||
            !card.restrictions ||
            card.restrictions?.investigator?.[card.code]),
      ]);
    }

    const ors = [];

    const investigatorFilter = filterInvestigatorAccess(investigatorBack, {
      additionalDeckOptions: getAdditionalDeckOptions(resolvedDeck),
      customizable: {
        properties: "all",
        level: "all",
      },
      investigatorFront: resolvedDeck.investigatorFront.card,
      selections: resolvedDeck.selections,
      targetDeck,
      showLimitedAccess,
    });

    const weaknessFilter = filterInvestigatorWeaknessAccess(investigatorBack, {
      targetDeck,
    });

    if (investigatorFilter) ors.push(investigatorFilter);
    if (weaknessFilter) ors.push(weaknessFilter);

    const investigatorAccessFilter = or(ors);

    const ands = [investigatorAccessFilter];

    const cardPool = resolvedDeck.cardPool;
    const sealedDeck = resolvedDeck.sealedDeck?.cards;

    if (!cardPool?.length && !sealedDeck) {
      return and(ands);
    }

    const cardInDeckFilter = (card: Card) => containsCard(resolvedDeck, card);

    const xpNullPoolFilter = (card: Card) => {
      if (card.subtype_code === "basicweakness") {
        // allow rbw only if useLimitedPoolForWeaknessDraw is set to false
        return (
          card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS ||
          !settings.useLimitedPoolForWeaknessDraw
        );
      }

      // allow signatures or campaign cards
      return (
        !card.duplicate_of_code &&
        card.xp == null &&
        (!!card.restrictions || !!card.encounter_code)
      );
    };

    if (cardPool?.length) {
      const cardPoolFilter = filterCardPool(cardPool, metadata, lookupTables);

      if (cardPoolFilter) {
        ands.push(or([cardPoolFilter, xpNullPoolFilter, cardInDeckFilter]));
      }
    }

    if (sealedDeck) {
      ands.push(
        or([
          filterSealed(sealedDeck, lookupTables),
          xpNullPoolFilter,
          cardInDeckFilter,
        ]),
      );
    }

    return and(ands);
  },
);

const customizationsEqual = (
  a: ResolvedDeck | undefined,
  b: ResolvedDeck | undefined,
) => {
  return isResolvedDeck(a) && isResolvedDeck(b)
    ? JSON.stringify(a.customizations) === JSON.stringify(b.customizations)
    : // biome-ignore lint/suspicious/noDoubleEquals: we want a shallow equality check in this context.
      a == b;
};

const selectDeckCachedByCustomizations = createSelector(
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (resolvedDeck) => resolvedDeck,
  {
    memoizeOptions: {
      resultEqualityCheck: customizationsEqual,
    },
  },
);

const selectDeckCustomizations = createSelector(
  selectDeckCachedByCustomizations,
  (resolvedDeck) => resolvedDeck?.customizations,
);

const fanMadeDataEqual = (
  a: ResolvedDeck | undefined,
  b: ResolvedDeck | undefined,
) => {
  return isResolvedDeck(a) && isResolvedDeck(b)
    ? JSON.stringify(a.fanMadeData) === JSON.stringify(b.fanMadeData)
    : // biome-ignore lint/suspicious/noDoubleEquals: we want a shallow equality check in this context.
      a == b;
};

const selectDeckCachedByFanMadeData = createSelector(
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (resolvedDeck) => resolvedDeck,
  {
    memoizeOptions: {
      resultEqualityCheck: fanMadeDataEqual,
    },
  },
);

const selectDeckFanMadeData = createSelector(
  selectDeckCachedByFanMadeData,
  (resolvedDeck) => resolvedDeck?.fanMadeData,
);

const selectBaseListCards = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.fanMadeData.projects,
  (state: StoreState) => selectActiveList(state)?.systemFilter,
  (state: StoreState) => selectActiveList(state)?.filterValues,
  selectDeckInvestigatorFilter,
  selectCanonicalTabooSetId,
  selectDeckCustomizations,
  selectDeckFanMadeData,
  selectCollection,
  (
    metadata,
    lookupTables,
    fanMadeProjects,
    systemFilter,
    filterValues,
    deckInvestigatorFilter,
    tabooSetId,
    customizations,
    fanMadeData,
    collection,
  ) => {
    if (isEmpty(metadata.cards)) {
      console.warn("player cards selected before store is initialized.");
      return undefined;
    }

    time("select_base_list_cards");

    let filteredCards = Object.values(metadata.cards);

    // filters can be impacted by card changes, apply them now.
    if (tabooSetId || customizations) {
      filteredCards = filteredCards.map((c) =>
        applyCardChanges(c, metadata, tabooSetId, customizations),
      );
    }

    const filters = [];

    if (systemFilter) filters.push(systemFilter);

    // Filter fan made data that is not owned and does not belong to this specific deck.
    filters.push((card: Card) => {
      if (card.official) return true;

      const pack = metadata.packs[card.pack_code];
      if (!pack?.cycle_code) return false;

      return Boolean(
        fanMadeData?.cards?.[card.code] || fanMadeProjects?.[pack.cycle_code],
      );
    });

    if (deckInvestigatorFilter) {
      filters.push(deckInvestigatorFilter);
    }

    if (filterValues) {
      const ownershipFilter = Object.values(filterValues).find(
        (f) => f.type === "ownership",
      );

      if (ownershipFilter) {
        const value = ownershipFilter.value as OwnershipFilter;

        if (value !== "all") {
          filters.push((card: Card) => {
            const ownership = filterOwnership(
              card,
              metadata,
              lookupTables,
              collection,
              false,
            );

            return value === "owned" ? ownership : !ownership;
          });
        }
      }

      const cardTypeFilter = Object.values(filterValues).find(
        (f) => f.type === "card_type",
      );

      if (cardTypeFilter) {
        const value = cardTypeFilter.value as CardTypeFilter;

        if (value === "player") {
          filters.push(not(filterEncounterCards));
        } else if (value === "encounter") {
          filters.push(filterEncounterCards);
        }
      }

      const fanMadeContentFilter = Object.values(filterValues).find(
        (f) => f.type === "fan_made_content",
      );

      if (fanMadeContentFilter) {
        const value = fanMadeContentFilter.value as FanMadeContentFilter;

        if (value === "official") {
          filters.push(filterOfficial);
        } else if (value === "fan-made") {
          filters.push(not(filterOfficial));
        }
      }
    }

    if (filters.length) {
      filteredCards = filteredCards.filter(and(filters));
    }

    timeEnd("select_base_list_cards");
    return filteredCards;
  },
);

export const selectListCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectActiveList,
  selectBaseListCards,
  selectLocaleSortingCollator,
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (
    _: StoreState,
    __: ResolvedDeck | undefined,
    targetDeck: TargetDeck | undefined,
  ) => targetDeck,
  (state: StoreState) => state.ui.showUnusableCards,
  (
    metadata,
    lookupTables,
    activeList,
    _filteredCards,
    sortingCollator,
    deck,
    targetDeck,
    showUnusableCards,
  ) => {
    if (!_filteredCards || !activeList) return undefined;

    time("select_list_cards");
    let filteredCards = _filteredCards;

    // filter duplicates, taking into account the deck and list context.
    if (!showUnusableCards) {
      filteredCards = filteredCards.filter(
        filterDuplicatesFromContext(
          filteredCards,
          activeList,
          metadata,
          lookupTables,
          deck,
        ),
      );
    }

    // apply search after initial filtering to cut down on search operations.
    const search = activeList.search;

    if (search.value) {
      if (search.mode === "buildql") {
        if (search.buildQlSearch) {
          try {
            filteredCards = filteredCards.filter(search.buildQlSearch);
          } catch {}
        }
      } else {
        filteredCards = applySearch(activeList.search, filteredCards, metadata);
      }
    }

    // this is the count of cards that a search would have matched before user filters are taken into account.
    const totalCardCount = filteredCards.length;

    // apply user filters.
    const userFilter = makeUserFilter(
      metadata,
      lookupTables,
      activeList,
      deck,
      targetDeck,
    );

    if (userFilter) {
      filteredCards = filteredCards.filter(
        (card) =>
          userFilter(card) ||
          // surface cards where the backside matches the filter
          (!!card.back_link_id &&
            metadata.cards[card.back_link_id] &&
            userFilter(metadata.cards[card.back_link_id])),
      );
    }

    const cards: Card[] = [];
    const groups: CardGroup[] = [];
    const groupCounts: number[] = [];

    const groupedCards = getGroupedCards(
      activeList.display.grouping,
      filteredCards,
      makeSortFunction(activeList.display.sorting, metadata, sortingCollator),
      metadata,
      sortingCollator,
    );

    for (const group of groupedCards.data) {
      cards.push(...group.cards);

      groups.push({
        key: group.key,
        type: group.type,
      });

      groupCounts.push(group.cards.length);
    }

    timeEnd("select_list_cards");

    return {
      key: activeList.key,
      groups,
      cards,
      groupCounts,
      totalCardCount,
    } as ListState;
  },
);

export const selectCardRelationsResolver = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (metadata, lookupTables, collator) => {
    return (code: string) => {
      // for the current use case (investigator signatures), customizations and taboo are irrelevant.
      return resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        code,
        undefined,
        undefined,
        true,
      );
    };
  },
);

/**
 * Utilities
 */

export const selectListFilterProperties = createSelector(
  selectMetadata,
  selectLookupTables,
  selectBaseListCards,
  (metadata, lookupTables, cards) => {
    time("select_card_list_properties");

    const actionTable = lookupTables.actions;

    const cost = { min: Number.MAX_SAFE_INTEGER, max: 0 };
    const health = { min: Number.MAX_SAFE_INTEGER, max: 0 };
    const sanity = { min: Number.MAX_SAFE_INTEGER, max: 0 };

    const skills = SKILL_KEYS.reduce(
      (acc, key) => {
        acc[key as SkillKey] = { min: Number.MAX_SAFE_INTEGER, max: 0 };
        return acc;
      },
      {} as Record<SkillKey, { min: number; max: number }>,
    );

    const actions = new Set<string>();
    const cardTypes = new Set<string>();
    const encounterSets = new Set<string>();
    const factions = new Set<string>();
    const illustrators = new Set<string>();
    const investigators = new Set<string>();
    const levels = new Set<number | null>();
    const packs = new Set<string>();
    const traits = new Set<string>();
    const types = new Set<string>();

    if (cards) {
      for (const card of cards) {
        if (card.type_code === "investigator") {
          investigators.add(card.code);
        }

        if (card.encounter_code) {
          cardTypes.add("encounter");
        } else {
          cardTypes.add("player");
        }

        levels.add(card.xp ?? null);
        types.add(card.type_code);

        packs.add(card.pack_code);
        const pack = metadata.packs[card.pack_code];

        if (official(pack) && !pack?.reprint) {
          const cycle = metadata.cycles[pack?.cycle_code];
          const reprintPackId = `${cycle?.code}${card.encounter_code ? "c" : "p"}`;
          const reprintPack = metadata.packs[reprintPackId];
          if (reprintPack?.reprint) packs.add(reprintPack.code);
        }

        if (card.encounter_code) {
          encounterSets.add(card.encounter_code);
        }

        factions.add(card.faction_code);

        if (card.faction2_code) {
          factions.add(card.faction2_code);
        }

        if (card.faction3_code) {
          factions.add(card.faction3_code);
        }

        if (card.illustrator) {
          illustrators.add(card.illustrator);
        }

        if (card.back_illustrator) {
          illustrators.add(card.back_illustrator);
        }

        if (card.cost != null) {
          cost.min = Math.min(cost.min, Math.max(card.cost, 0));
          cost.max = Math.max(cost.max, Math.max(card.cost, 0));
        }

        // filter out enemies.
        if (card.type_code === "asset" || card.type_code === "investigator") {
          health.min = Math.min(health.min, Math.max(card.health ?? 0, 0));
          sanity.min = Math.min(sanity.min, Math.max(card.sanity ?? 0, 0));
        }

        if (card.health) {
          health.max = Math.max(health.max, card.health);
        }

        if (card.sanity) {
          sanity.max = Math.max(sanity.max, card.sanity);
        }

        for (const _skill of Object.keys(skills)) {
          const skill = _skill as SkillKey;

          const value = card[`skill_${skill}`];

          if (skills[skill] && value != null && value >= 0) {
            skills[skill].min = Math.min(skills[skill].min, value);
            skills[skill].max = Math.max(skills[skill].max, value);
          }
        }

        for (const trait of splitMultiValue(card.real_traits)) {
          traits.add(trait);
        }

        for (const trait of splitMultiValue(card.real_back_traits)) {
          traits.add(trait);
        }
      }

      for (const [key, table] of Object.entries(actionTable)) {
        for (const card of cards) {
          if (actions.has(key)) {
            break;
          }

          if (table[card.code]) {
            actions.add(key);
          }
        }
      }
    }

    timeEnd("select_card_list_properties");

    return {
      actions,
      cardTypes,
      cost,
      encounterSets,
      factions,
      health,
      illustrators,
      investigators,
      levels,
      packs,
      sanity,
      skills,
      traits,
      types,
    };
  },
);

/**
 * Actions
 */

export const selectActionMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => ({ code, name: i18n.t(`common.actions.${code}`) });
  },
);

export const selectActionOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  selectActionMapper,
  ({ actions }, collator, mapper) => {
    return Array.from(actions)
      .map(mapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Asset
 */

export const selectUsesMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      const displayStr = i18n.exists(`common.uses.${code}`)
        ? i18n.t(`common.uses.${code}`)
        : capitalize(code);
      return { code, name: displayStr };
    };
  },
);

export const selectSlotsMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      const displayStr =
        code === NO_SLOT_STRING
          ? i18n.t("common.slot.none")
          : i18n.t(`common.slot.${code.toLowerCase()}`);
      return { code, name: displayStr };
    };
  },
);

export const selectAssetOptions = createSelector(
  selectLookupTables,
  selectLocaleSortingCollator,
  selectListFilterProperties,
  (lookupTables, collator, filterProps) => {
    const uses = Object.keys(lookupTables.uses)
      .map((code) => ({
        code,
        name: i18n.exists(`common.uses.${code}`)
          ? i18n.t(`common.uses.${code}`)
          : capitalize(code),
      }))
      .sort((a, b) => collator.compare(a.name, b.name));

    const skillBoosts = SKILL_KEYS.filter((x) => x !== "wild");

    uses.sort();

    return {
      health: filterProps.health,
      sanity: filterProps.sanity,
      uses,
      slots: [
        { code: NO_SLOT_STRING, name: i18n.t("common.slot.none") },
        ...ASSET_SLOT_ORDER.map((code) => ({
          code,
          name: i18n.t(`common.slot.${code.toLowerCase()}`),
        })),
      ],
      skillBoosts,
    };
  },
);

/**
 * Cost
 */

export function costToString(cost: number) {
  if (cost === -1) return i18n.t("filters.cost.nocost");
  return cost.toString();
}

export const selectCostMinMax = createSelector(
  selectListFilterProperties,
  ({ cost }) => cost,
);

/**
 * Encounter Set
 */
function sortedEncounterSets(metadata: Metadata, collator: Intl.Collator) {
  const encounterSets = Object.values(metadata.encounterSets);

  const byEncounterSet = sortByEncounterSet(metadata, collator);
  encounterSets.sort((a, b) => byEncounterSet(a.pack_code, b.pack_code));

  return encounterSets;
}

export const selectEncounterSetMapper = createSelector(
  selectMetadata,
  (metadata) => {
    return (code: string) => metadata.encounterSets[code];
  },
);

export const selectEncounterSetOptions = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  selectListFilterProperties,
  (metadata, collator, listFilterProperties) =>
    sortedEncounterSets(metadata, collator).filter((set) =>
      listFilterProperties.encounterSets.has(set.code),
    ),
);

/**
 * Factions
 */

export const selectFactionOptions = createSelector(
  selectListFilterProperties,
  selectMetadata,
  ({ factions }, metadata) => {
    return Object.values(metadata.factions)
      .filter((f) => factions.has(f.code))
      .sort(
        (a, b) =>
          FACTION_ORDER.indexOf(a.code as FactionName) -
          FACTION_ORDER.indexOf(b.code as FactionName),
      );
  },
);

/**
 * Health
 */

export const selectHealthMinMax = createSelector(
  selectListFilterProperties,
  ({ health }) => health,
);

/**
 * Illustrator
 */

export const selectIllustratorOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  (properties, collator) => {
    return Array.from(properties.illustrators)
      .map((code) => ({ code }))
      .sort((a, b) => collator.compare(a.code, b.code));
  },
);

/**
 * Investigator
 */

export const selectInvestigatorOptions = createSelector(
  selectListFilterProperties,
  selectMetadata,
  selectLocaleSortingCollator,
  (listFilterProperties, metadata, collator) => {
    const investigators = Array.from(listFilterProperties.investigators).reduce<
      Card[]
    >((acc, code) => {
      const card = metadata.cards[code];

      if (card && !card.duplicate_of_code && !card.encounter_code) {
        acc.push(card);
      }

      return acc;
    }, []);

    investigators.sort(sortByName(collator));

    return [
      { label: i18n.t("filters.investigator.any_investigator"), value: "" },
      ...investigators.map((card) => ({
        label: displayAttribute(card, "name"),
        value: card.code,
      })),
    ];
  },
);

/**
 * Investigator Card Access
 */

// FIXME: consider how to handle fan-made content here
export const selectCardOptions = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    const sortFn = makeSortFunction(["name", "level"], metadata, collator);

    return Object.values(metadata.cards)
      .filter((card) => {
        return (
          !filterEncounterCards(card) &&
          filterMythosCards(card) &&
          filterDuplicates(card) &&
          filterBacksides(card) &&
          card.type_code !== "investigator" &&
          !card.subtype_code
        );
      })
      .sort(sortFn);
  },
);

/**
 * Investigator Skill Icons
 */

export const selectSkillIconsMinMax = createSelector(
  selectListFilterProperties,
  ({ skills }) => skills,
);

/**
 * Level
 */

export function levelToString(value: number) {
  if (value === -1) return i18n.t("filters.level.no_level");
  return value.toString();
}

/**
 * Packs
 */

export type CycleWithPacks = Cycle & {
  packs: Pack[];
  reprintPacks: Pack[];
};

export const selectCyclesAndPacks = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.settings,
  (metadata, lookupTables, settings) => {
    const cycles = Object.entries(lookupTables.packsByCycle).reduce(
      (acc, [cycleCode, packTable]) => {
        const cycle = metadata.cycles[cycleCode];

        const packs: Pack[] = [];
        const reprintPacks: Pack[] = [];

        for (const code of Object.keys(packTable)) {
          const pack = metadata.packs[code];
          (pack.reprint ? reprintPacks : packs).push(pack);
        }

        reprintPacks.sort((a, b) => a.position - b.position);
        packs.sort((a, b) => a.position - b.position);

        const canShowCycle =
          settings.showPreviews ||
          packs.some(
            (pack) =>
              !pack.date_release || new Date(pack.date_release) <= new Date(),
          );

        if (canShowCycle) {
          acc.push({ ...cycle, packs, reprintPacks });
        }

        return acc;
      },
      [] as CycleWithPacks[],
    );

    cycles.sort((a, b) => a.position - b.position);

    return cycles;
  },
);

export const selectCampaignCycles = createSelector(
  selectCyclesAndPacks,
  (cycles) =>
    cycles.filter(
      (cycle) =>
        official(cycle) && !CYCLES_WITH_STANDALONE_PACKS.includes(cycle.code),
    ),
);

export const selectPackMapper = createSelector(selectMetadata, (metadata) => {
  return (code: string) => metadata.packs[code];
});

export const selectPackOptions = createSelector(
  selectListFilterProperties,
  selectCyclesAndPacks,
  (listFilterProperties, cycles) => {
    return cycles.reduce((acc, cycle) => {
      if (cycle.reprintPacks.length && cycle.code !== "core") {
        acc.push(
          ...cycle.reprintPacks.filter((p) =>
            listFilterProperties.packs.has(p.code),
          ),
        );
      } else if (official(cycle) && cycle.packs.length === 2) {
        acc.push(
          ...cycle.packs.filter((p) => listFilterProperties.packs.has(p.code)),
        );
      } else {
        acc.push(
          ...[...cycle.packs, ...cycle.reprintPacks].filter((p) =>
            listFilterProperties.packs.has(p.code),
          ),
        );
      }

      return acc;
    }, [] as Pack[]);
  },
);

function newFormatPlayerPack(pack: Pack) {
  return pack.code.endsWith("p");
}

export const selectLimitedPoolPackOptions = createSelector(
  selectCyclesAndPacks,
  (state: StoreState) => state.fanMadeData.projects,
  (cycles, fanMadeProjects) => {
    return cycles.flatMap((cycle) => {
      // Fan-made content
      if (!official(cycle)) {
        if (!fanMadeProjects?.[cycle.code]) return [];
        return cycle.packs;
      }

      // Core set
      if (cycle.code === "core") {
        return [...cycle.reprintPacks, ...cycle.packs];
      }

      // Reprinted new format
      if (cycle.reprintPacks.length) {
        return cycle.reprintPacks.filter(newFormatPlayerPack);
      }

      // New format
      if (cycle.packs.length === 2) {
        return cycle.packs.filter(newFormatPlayerPack);
      }

      // Everything else
      return cycle.packs;
    });
  },
);

export const selectLimitedPoolPacks = createSelector(
  selectMetadata,
  (_: StoreState, pool: string[] | undefined) => pool,
  (metadata, pool) => resolveLimitedPoolPacks(metadata, pool),
);

/**
 * Properties
 */

export const selectPropertyOptions = createSelector(
  selectActiveList,
  selectLocaleSortingCollator, // HACK: trigger re-evaluation on locale change
  (list) => {
    if (!list) return [];
    const t = i18n.t;
    return [
      { key: "bonded", label: t("common.decks.bondedSlots_short") },
      { key: "customizable", label: t("common.customizable") },
      { key: "exile", label: t("common.exile") },
      { key: "exceptional", label: t("common.exceptional") },
      { key: "fast", label: t("common.fast") },
      {
        key: "healsDamage",
        label: t("filters.properties.heals_damage"),
      },
      {
        key: "healsHorror",
        label: t("filters.properties.heals_horror"),
      },
      {
        key: "multiClass",
        label: t("common.factions.multiclass"),
      },
      { key: "myriad", label: t("common.myriad") },
      { key: "permanent", label: t("common.permanent") },
      { key: "seal", label: t("common.seal") },
      { key: "specialist", label: t("common.specialist") },
      { key: "succeedBy", label: t("filters.properties.succeed_by") },
      {
        key: "unique",
        label: t("common.unique"),
      },
      { key: "victory", label: t("common.victory") },
    ].filter((p) => list.display.properties?.includes(p.key));
  },
);

/**
 * Sanity
 */

export const selectSanityMinMax = createSelector(
  selectListFilterProperties,
  ({ sanity }) => sanity,
);

/**
 * Search
 */

export const selectActiveListSearch = createSelector(
  selectActiveList,
  (list) => list?.search,
);

export const selectResolvedCardById = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, code: string) => code,
  (_: StoreState, __: string, resolvedDeck?: ResolvedDeck) => resolvedDeck,
  (state: StoreState, __: string, resolvedDeck?: ResolvedDeck) =>
    selectCanonicalTabooSetId(state, resolvedDeck),
  (metadata, lookupTables, collator, code, resolvedDeck, tabooSetId) => {
    return resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      code,
      tabooSetId,
      resolvedDeck?.customizations,
      true,
    );
  },
);

/**
 * Subtype
 */

function subtypeLabels() {
  return {
    none: i18n.t("common.subtype.none"),
    weakness: i18n.t("common.subtype.weakness"),
    basicweakness: i18n.t("common.subtype.basicweakness"),
  } as Record<string, string>;
}

export function selectSubtypeOptions() {
  const labels = subtypeLabels();
  return [
    { code: "none", name: labels["none"] },
    { code: "weakness", name: labels["weakness"] },
    { code: "basicweakness", name: labels["basicweakness"] },
  ];
}

/**
 * Taboo Set
 */

export const selectTabooSetOptions = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    const sets = Object.values(metadata.tabooSets);
    sets.sort((a, b) => collator.compare(b.date, a.date));
    return sets;
  },
);

/**
 * Trait
 */

export const selectTraitOptions = createSelector(
  selectListFilterProperties,
  selectTraitMapper,
  selectLocaleSortingCollator,
  ({ traits }, traitMapper, collator) => {
    return Array.from(traits)
      .map(traitMapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Type
 */

export const selectTypeMapper = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, _) => {
    return (code: string) => {
      return {
        ...metadata.types[code],
        name: i18n.t(`common.type.${code}`),
      };
    };
  },
);

export const selectTypeOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  selectTypeMapper,
  ({ types }, collator, mapper) => {
    return Array.from(types)
      .map(mapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Upgrades
 */

export type AvailableUpgrades = {
  upgrades: Record<string, Card[]>;
  shrewdAnalysisPresent: boolean;
};

export const selectAvailableUpgrades = createSelector(
  selectDeckInvestigatorFilter,
  selectMetadata,
  selectLookupTables,
  (_: StoreState, deck: ResolvedDeck) => deck,
  (_: StoreState, __: ResolvedDeck, target: "slots" | "extraSlots") => target,
  (accessFilter, metadata, lookupTables, deck, target) => {
    const availableUpgrades: AvailableUpgrades = {
      upgrades: {},
      shrewdAnalysisPresent: false,
    };

    if (!deck.previous_deck) return availableUpgrades;

    const cards = Object.values(deck.cards[target] ?? {});
    if (isEmpty(cards)) return availableUpgrades;

    for (const { card } of cards) {
      if (card.code === SPECIAL_CARD_CODES.SHREWD_ANALYSIS) {
        availableUpgrades.shrewdAnalysisPresent = true;
        continue;
      }

      const versions = lookupTables.relations.level[card.code];
      if (!versions) continue;

      for (const code of Object.keys(versions)) {
        const version = metadata.cards[code];

        if (
          !version.duplicate_of_code &&
          version?.xp &&
          version.xp > (card.xp ?? 0) &&
          accessFilter?.(version)
        ) {
          availableUpgrades.upgrades[card.code] ??= [];
          availableUpgrades.upgrades[card.code].push(version);
        }
      }
    }

    return availableUpgrades;
  },
);

/**
 * Filter changes
 */

function formatHealthChanges(value: [number, number] | undefined, key: string) {
  if (!value) return "";
  let s = `${value[0]}`;
  if (value[1] !== value[0]) s = `${s}-${value[1]}`;
  return `${key}: ${s}`;
}

function selectAssetChanges(value: AssetFilter) {
  const t = i18n.t;

  const slot = value.slots.reduce((acc, key) => {
    return !acc
      ? `${t("filters.slot.title")}: ${key}`
      : `${acc} ${t("filters.or")} ${key}`;
  }, "");

  const uses = value.uses.reduce((acc, key) => {
    const displayStr = i18n.exists(`common.uses.${key}`)
      ? t(`common.uses.${key}`)
      : capitalize(key);

    return !acc
      ? `${t("filters.uses.title")}: ${displayStr}`
      : `${acc} ${t("filters.or")} ${displayStr}`;
  }, "");

  const skillBoosts = value.skillBoosts.reduce((acc, key) => {
    const displayStr = t(`common.skill.${key}`);

    return !acc
      ? `${t("filters.skill_boost.title")}: ${displayStr}`
      : `${acc} ${t("filters.or")} ${displayStr}`;
  }, "");

  const healthFilter = formatHealthChanges(
    value.health,
    t("filters.health.title"),
  );

  const sanityFilter = formatHealthChanges(
    value.sanity,
    t("filters.sanity.title"),
  );

  return [slot, uses, skillBoosts, sanityFilter, healthFilter]
    .filter((x) => x)
    .join(", ");
}

const selectActionChanges = (value: MultiselectFilter) => {
  if (!value.length) return "";
  return value.map((code) => i18n.t(`common.actions.${code}`)).join(", ");
};

function selectCostChanges(value: CostFilter) {
  if (!value.range) return "";

  const min = costToString(value.range[0]);

  let s = min;
  if (value.range[1] !== value.range[0])
    s = `${s}-${costToString(value.range[1])}`;
  if (value.even) s = `${s}, even`;
  if (value.odd) s = `${s}, odd`;
  if (value.x) s = `${s}, X`;

  return s;
}

const selectEncounterSetChanges = createSelector(
  (_: StoreState, value: MultiselectFilter) => value,
  selectMetadata,
  (value, metadata) => {
    return value
      .map((id) => metadata.encounterSets[id].name)
      .join(` ${i18n.t("filters.or")} `);
  },
);

function selectFanMadeContentChanges(value: FanMadeContentFilter) {
  const t = i18n.t;
  return value === "all"
    ? ""
    : value === "official"
      ? t("filters.fan_made_content.official")
      : t("filters.fan_made_content.fan_made");
}

function selectHealthChanges(value: [number, number] | undefined) {
  return formatHealthChanges(value, i18n.t("filters.health.title"));
}

export function selectIllustratorChanges(value: MultiselectFilter) {
  const count = value.length;
  if (!count) return "";
  return value.join(` ${i18n.t("filters.or")} `);
}

function selectInvestigatorCardAccessChanges(value: MultiselectFilter) {
  const count = value.length;
  if (!count) return "";
  return `${count} ${i18n.t("common.card", { count })}`;
}

const selectInvestigatorChanges = createSelector(
  (_: StoreState, value: SelectFilter) => value,
  selectMetadata,
  (value, metadata) => {
    if (!value) return "";
    const card = metadata.cards[value];
    return card
      ? `${card.parallel ? "|| " : ""}${displayAttribute(card, "name")}`
      : value.toString();
  },
);

function selectInvestigatorSkillIconsChanges(value?: InvestigatorSkillsFilter) {
  if (!value) return "";

  return Object.entries(value).reduce((acc, [key, val]) => {
    if (!val) return acc;

    const skillStr = i18n.t(`common.skill.${key}`);
    const s = `${val[0]}-${val[1]} ${skillStr}`;

    return acc ? `${acc} ${i18n.t("filters.and")} ${s}` : s;
  }, "");
}

function selectLevelChanges(value: LevelFilter) {
  if (!value.range) return undefined;

  const min = levelToString(value.range[0]);

  let str = min;
  if (value.range[1] !== value.range[0]) {
    const max = levelToString(value.range[1]);
    str = `${str}-${max}`;
  }

  return str;
}

function selectOwnershipChanges(value: OwnershipFilter) {
  const t = i18n.t;
  return value === "all"
    ? ""
    : value === "owned"
      ? t("filters.ownership.owned")
      : t("filters.ownership.unowned");
}

const selectPackChanges = createSelector(
  selectMetadata,
  (_: StoreState, value: MultiselectFilter) => value,
  (metadata, value) => {
    if (!value) return "";

    return resolveLimitedPoolPacks(metadata, value)
      .map((pack) => displayPackName(pack))
      .join(` ${i18n.t("filters.or")} `);
  },
);

function selectPropertiesChanges(state: StoreState, value: PropertiesFilter) {
  const propertyOptions = selectPropertyOptions(state);

  return Object.entries(value).reduce((acc, [key, filterValue]) => {
    if (!filterValue) return acc;
    const displayStr = propertyOptions.find((x) => x.key === key)?.label ?? key;
    return !acc ? displayStr : `${acc} ${i18n.t("filters.and")} ${displayStr}`;
  }, "");
}

function selectSanityChanges(value: [number, number] | undefined) {
  return formatHealthChanges(value, "Sanity");
}

function selectSkillIconsChanges(value: SkillIconsFilter) {
  return Object.entries(value).reduce((acc, [key, val]) => {
    if (!val) return acc;

    const displayStr =
      key === "any"
        ? i18n.t("filters.skill_icons.any")
        : i18n.t(`common.skill.${key}`);

    const s = `${val}+ ${displayStr}`;

    return acc ? `${acc} ${i18n.t("filters.and")} ${s}` : s;
  }, "");
}

function selectSubtypeChanges(value: SubtypeFilter) {
  const options = Object.entries(value);
  const enabled = options.filter(([, value]) => !!value);
  if (enabled.length === options.length) return "";

  const labels = subtypeLabels();
  if (enabled.length === 0) return labels["none"];

  return enabled.map(([key]) => labels[key]).join(` ${i18n.t("filters.or")} `);
}

const selectTabooSetChanges = createSelector(
  (_: StoreState, value: SelectFilter) => value,
  selectMetadata,
  (value, metadata) => {
    if (!value) return "";
    const set = metadata.tabooSets[value];
    return set ? formatTabooSet(set) : value.toString();
  },
);

function selectTraitChanges(value: MultiselectFilter) {
  if (!value.length) return "";

  return value
    .map((code) => {
      const key = `common.traits.${code}`;
      return i18n.exists(key) ? i18n.t(key) : code;
    })
    .join(` ${i18n.t("filters.or")} `);
}

function selectTypeChanges(value: MultiselectFilter) {
  if (!value.length) return "";
  return value
    .map((code) => i18n.t(`common.type.${code}`))
    .join(` ${i18n.t("filters.or")} `);
}

export function selectFilterChanges<T extends keyof FilterMapping>(
  state: StoreState,
  type: T,
  value: FilterMapping[T],
) {
  switch (type) {
    case "action": {
      return selectActionChanges(value as MultiselectFilter);
    }

    case "asset": {
      return selectAssetChanges(value as AssetFilter);
    }

    case "cost": {
      return selectCostChanges(value as CostFilter);
    }

    case "encounter_set": {
      return selectEncounterSetChanges(state, value as MultiselectFilter);
    }

    case "faction": {
      return "";
    }

    case "fan_made_content": {
      return selectFanMadeContentChanges(value as FanMadeContentFilter);
    }

    case "health": {
      return selectHealthChanges(value as HealthFilter);
    }

    case "investigator": {
      return selectInvestigatorChanges(state, value as SelectFilter);
    }

    case "investigator_card_access": {
      return selectInvestigatorCardAccessChanges(value as MultiselectFilter);
    }

    case "investigator_skills": {
      return selectInvestigatorSkillIconsChanges(
        value as InvestigatorSkillsFilter,
      );
    }

    case "level": {
      return selectLevelChanges(value as LevelFilter);
    }

    case "ownership": {
      return selectOwnershipChanges(value as OwnershipFilter);
    }

    case "pack": {
      return selectPackChanges(state, value as MultiselectFilter);
    }

    case "properties": {
      return selectPropertiesChanges(state, value as PropertiesFilter);
    }

    case "sanity": {
      return selectSanityChanges(value as SanityFilter);
    }

    case "skill_icons": {
      return selectSkillIconsChanges(value as SkillIconsFilter);
    }

    case "subtype": {
      return selectSubtypeChanges(value as SubtypeFilter);
    }

    case "taboo_set": {
      return selectTabooSetChanges(state, value as SelectFilter);
    }

    case "trait": {
      return selectTraitChanges(value as MultiselectFilter);
    }

    case "type": {
      return selectTypeChanges(value as MultiselectFilter);
    }
  }
}

type FilterChange = {
  type: keyof FilterMapping;
  change: string;
};

export const selectActiveListChanges = createSelector(
  (state: StoreState) => state,
  (state) => {
    const list = selectActiveList(state);
    if (!list) return [];

    const changes = list.filters.reduce((acc, type, id) => {
      const filter = list.filterValues[id];
      if (!filter) return acc;

      const change = selectFilterChanges(state, type, filter.value);
      if (change) acc.push({ type, change });

      return acc;
    }, [] as FilterChange[]);

    return changes;
  },
);
