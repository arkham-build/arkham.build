import { applyTaboo } from "@/store/lib/card-edits";
import type { Card } from "@/store/services/queries.types";
import { cardLimit, cardUses, splitMultiValue } from "@/utils/card-utils";
import {
  ACTION_TEXT_ENTRIES,
  REGEX_BONDED,
  REGEX_SKILL_BOOST,
  REGEX_SUCCEED_BY,
} from "@/utils/constants";
import { time, timeEnd } from "@/utils/time";
import type { Metadata } from "../slices/metadata.types";
import type { SettingsState } from "../slices/settings.types";
import type { LookupTable, LookupTables } from "./lookup-tables.types";

function getInitialLookupTables(): LookupTables {
  return {
    relations: {
      base: {},
      bound: {},
      bonded: {},
      fronts: {},
      restrictedTo: {},
      requiredCards: {},
      parallel: {},
      parallelCards: {},
      advanced: {},
      replacement: {},
      level: {},
      duplicates: {},
      otherVersions: {},
    },
    actions: {},
    encounterCode: {},
    factionCode: {},
    subtypeCode: {},
    typeCode: {},
    properties: {
      fast: {},
      multislot: {},
      succeedBy: {},
    },
    skillBoosts: {},
    traits: {},
    uses: {},
    level: {},
    traitsByCardTypeSelection: {},
    packsByCycle: {},
  };
}

export function createLookupTables(
  metadata: Metadata,
  settings: SettingsState,
) {
  time("refresh_lookup_tables");
  const lookupTables = getInitialLookupTables();

  const cards = Object.values(metadata.cards);

  for (const card of cards) {
    addCardToLookupTables(
      lookupTables,
      applyTaboo(card, metadata, settings.tabooSetId),
    );
  }

  createRelations(metadata, lookupTables);
  addPacksToLookupTables(metadata, lookupTables);

  timeEnd("refresh_lookup_tables");
  return lookupTables;
}

function setInLookupTable<T extends string | number>(
  code: keyof LookupTable<T>[T] | string,
  index: LookupTable<T>,
  key: T,
) {
  if (index[key]) {
    index[key][code] = 1;
  } else {
    index[key] = { [code]: 1 as const };
  }
}

function addCardToLookupTables(tables: LookupTables, card: Card) {
  indexByCodes(tables, card);
  indexByTraits(tables, card);
  indexByActions(tables, card);
  indexByFast(tables, card);

  // handle additional index based on whether we are dealing with a player card or not.
  if (card.faction_code !== "mythos") {
    indexByLevel(tables, card);

    indexByMulticlass(tables, card);

    indexBySucceedsBy(tables, card);

    if (card.type_code === "asset") {
      indexBySkillBoosts(tables, card);
      indexByUses(tables, card);
    }
  } else {
    // TODO: add enemy filters.
  }
}

function indexByCodes(tables: LookupTables, card: Card) {
  setInLookupTable(card.code, tables.factionCode, card.faction_code);
  setInLookupTable(card.code, tables.typeCode, card.type_code);

  if (card.subtype_code) {
    setInLookupTable(card.code, tables.subtypeCode, card.subtype_code);
  }

  if (card.encounter_code) {
    setInLookupTable(card.code, tables.encounterCode, card.encounter_code);
  }
}

function indexByTraits(tables: LookupTables, card: Card) {
  for (const trait of splitMultiValue(card.real_traits)) {
    setInLookupTable(card.code, tables.traits, trait);

    if (card.encounter_code || card.faction_code === "mythos") {
      setInLookupTable(trait, tables.traitsByCardTypeSelection, "encounter");
    } else {
      setInLookupTable(trait, tables.traitsByCardTypeSelection, "player");
    }
  }
}

function indexByActions(tables: LookupTables, card: Card) {
  // add card to action tables.
  for (const [key, value] of ACTION_TEXT_ENTRIES) {
    if (card.real_text?.includes(`<b>${value}`)) {
      setInLookupTable(card.code, tables.actions, key);
    }
  }
}

// TODO: use a regex.
function indexByFast(tables: LookupTables, card: Card) {
  if (
    card?.real_text?.includes("Fast.") ||
    card.real_text?.includes("gains fast.")
  ) {
    setInLookupTable(card.code, tables.properties, "fast");
  }
}

function indexByLevel(tables: LookupTables, card: Card) {
  if (card.xp) setInLookupTable(card.code, tables.level, card.xp);
}

function indexByMulticlass(tables: LookupTables, card: Card) {
  if (card.faction2_code) {
    setInLookupTable(card.code, tables.factionCode, card.faction2_code);
  }

  if (card.faction3_code) {
    setInLookupTable(card.code, tables.factionCode, card.faction3_code);
  }
}

// TODO: handle "+X skill value".
function indexBySkillBoosts(tables: LookupTables, card: Card) {
  if (card.customization_options?.find((o) => o.choice === "choose_skill")) {
    setInLookupTable(card.code, tables.skillBoosts, "willpower");
    setInLookupTable(card.code, tables.skillBoosts, "intellect");
    setInLookupTable(card.code, tables.skillBoosts, "combat");
    setInLookupTable(card.code, tables.skillBoosts, "agility");
  }

  const matches = card.real_text?.matchAll(REGEX_SKILL_BOOST);
  if (!matches) return;

  for (const match of matches) {
    if (match.length > 0) {
      setInLookupTable(card.code, tables.skillBoosts, match[1]);
    }
  }
}

function indexByUses(tables: LookupTables, card: Card) {
  const uses = cardUses(card);
  if (uses) {
    setInLookupTable(card.code, tables.uses, uses);
  }
}

function indexBySucceedsBy(tables: LookupTables, card: Card) {
  if (card.real_text?.match(REGEX_SUCCEED_BY)) {
    setInLookupTable(card.code, tables.properties, "succeedBy");
  }
}

export function createRelations(metadata: Metadata, tables: LookupTables) {
  time("create_relations");
  const cards = Object.values(metadata.cards);

  const bonded: Record<string, string[]> = {};

  const upgrades: Record<
    string,
    { code: string; subname?: string; xp: number }[]
  > = {};

  const backs: Record<string, string> = {};

  const investigatorsByName: Record<string, string[]> = {};

  // first pass: identify target cards.
  for (const card of cards) {
    if (card.xp && card.xp >= 0) {
      const upgrade = {
        code: card.code,
        subname: card.real_subname,
        xp: card.xp,
      };

      if (!upgrades[card.real_name]) {
        upgrades[card.real_name] = [upgrade];
      } else {
        upgrades[card.real_name].push(upgrade);
      }
    }

    const match = card.real_text?.match(REGEX_BONDED);

    if (match && match.length > 0) {
      if (!bonded[match[1]]) {
        bonded[match[1]] = [card.code];
      } else {
        bonded[match[1]].push(card.code);
      }
    }

    if (card.back_link_id) {
      backs[card.back_link_id] = card.code;
    }

    if (
      card.type_code === "investigator" &&
      !card.duplicate_of_code &&
      !card.alt_art_investigator &&
      !card.alternate_of_code
    ) {
      investigatorsByName[card.real_name] ??= [];
      investigatorsByName[card.real_name].push(card.code);
    }
  }

  // second pass: construct lookup tables.
  for (const card of cards) {
    if (card.deck_requirements?.card) {
      for (const code of Object.keys(card.deck_requirements.card)) {
        setInLookupTable(code, tables.relations.requiredCards, card.code);
      }
    }

    if (card.restrictions?.investigator && !card.hidden) {
      // Can have multiple entries (alternate arts).
      for (const key of Object.keys(card.restrictions.investigator)) {
        const investigator = metadata.cards[key];

        if (!investigator) {
          console.warn(`Missing investigator for ${key}`);
          continue;
        }

        if (investigator.duplicate_of_code) {
          setInLookupTable(
            investigator.duplicate_of_code,
            tables.relations.restrictedTo,
            card.code,
          );
          continue;
        }

        setInLookupTable(key, tables.relations.restrictedTo, card.code);

        if (card.real_text?.includes("Advanced.")) {
          setInLookupTable(card.code, tables.relations.advanced, key);
        } else if (card.real_text?.includes("Replacement.")) {
          setInLookupTable(card.code, tables.relations.replacement, key);
        } else {
          if (card.parallel) {
            setInLookupTable(card.code, tables.relations.parallelCards, key);
            // Kate has bonded cards restricted to her, these should not be part of the deck.
          } else if (cardLimit(card) > 0) {
            // TECH-DEBT
            // It should not be required to add cards to "requiredCards" here,
            // as resolving the relation "the other way around" should be enough/
            // However, there are some data inconsistencies with duplicate cards (Marie)
            // that make this necessary.
            setInLookupTable(card.code, tables.relations.requiredCards, key);
          }
        }
      }
    }

    if (
      card.type_code === "investigator" &&
      card.parallel &&
      card.alt_art_investigator &&
      card.alternate_of_code
    ) {
      setInLookupTable(
        card.code,
        tables.relations.parallel,
        card.alternate_of_code,
      );

      setInLookupTable(
        card.alternate_of_code,
        tables.relations.base,
        card.code,
      );
    }

    if (card.duplicate_of_code) {
      setInLookupTable(
        card.code,
        tables.relations.duplicates,
        card.duplicate_of_code,
      );
    }

    if (upgrades[card.real_name] && card.xp != null) {
      for (const upgrade of upgrades[card.real_name]) {
        if (
          card.code !== upgrade.code &&
          (!card.real_subname ||
            card.xp !== upgrade.xp ||
            upgrade.subname !== card.real_subname)
        ) {
          setInLookupTable(upgrade.code, tables.relations.level, card.code);
          setInLookupTable(card.code, tables.relations.level, upgrade.code);
        }
      }
    }

    // Index cards by back traits.

    if (card.real_back_traits) {
      for (const trait of splitMultiValue(card.real_back_traits)) {
        setInLookupTable(card.code, tables.traits, trait);
      }
    }

    if (backs[card.code] && card.real_traits) {
      for (const trait of splitMultiValue(card.real_traits)) {
        setInLookupTable(backs[card.code], tables.traits, trait);
      }
    }

    // TODO: there is an edge case with Dream-Gate where the front should show when accessing `06015b` via
    // a bond, but currently does not.
    if (!card.linked && bonded[card.real_name]) {
      for (const bondedCode of bonded[card.real_name]) {
        // beware the great hank samson.
        if (bondedCode !== card.code && !card.real_text?.startsWith("Bonded")) {
          setInLookupTable(bondedCode, tables.relations.bound, card.code);
          setInLookupTable(card.code, tables.relations.bonded, bondedCode);
        }
      }
    }

    // Index multi-class investigators.
    if (
      card.type_code === "investigator" &&
      card.deck_limit &&
      investigatorsByName[card.real_name]?.length > 1
    ) {
      for (const investigator of investigatorsByName[card.real_name]) {
        if (investigator !== card.code) {
          setInLookupTable(
            investigator,
            tables.relations.otherVersions,
            card.code,
          );
        }
      }
    }
  }

  for (const [back, front] of Object.entries(backs)) {
    setInLookupTable(front, tables.relations.fronts, back);
  }

  for (const [investigator, entry] of Object.entries(
    tables.relations.parallel,
  )) {
    const parallel = Object.keys(entry)[0];

    tables.relations.advanced[parallel] =
      tables.relations.advanced[investigator];
    tables.relations.replacement[parallel] =
      tables.relations.replacement[investigator];
    tables.relations.bonded[parallel] = tables.relations.bonded[investigator];
    tables.relations.parallelCards[parallel] =
      tables.relations.parallelCards[investigator];

    for (const [key, value] of Object.entries(tables.relations.restrictedTo)) {
      if (value[investigator]) {
        setInLookupTable(parallel, tables.relations.restrictedTo, key);
      }
    }
  }

  timeEnd("create_relations");
}

function addPacksToLookupTables(
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  for (const pack of Object.values(metadata.packs)) {
    setInLookupTable(pack.code, lookupTables.packsByCycle, pack.cycle_code);
  }
}
