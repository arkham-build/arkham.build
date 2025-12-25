import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import type { Deck } from "@/store/schemas/deck.schema";
import { getMockStore } from "@/test/get-mock-store";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import { validateDeck } from "./deck-validation";
import { resolveDeck } from "./resolve-deck";

const tests = [
  // Basic, valid decks
  ["valid: no errors", "base_case"],
  ["valid: forbidden card of quantity 0", "forbidden_quantity_0"],
  ["valid: max XP Lola", "max_xp_lola"],
  // Deck size
  ["invalid: too few cards", "too_few_cards"],
  ["invalid: too many cards", "too_many_cards"],
  // Deck limit
  ["invalid: too many copies of a card", "deck_limit_exceeded"],
  [
    "invalid: too many copies of a card by subname",
    "deck_limit_exceeded_subname",
  ],
  ["invalid: too many copies of a card by name", "deck_limit_exceeded_name"],
  // Signatures
  ["invalid: no signature", "required_missing_signature"],
  ["invalid: no signature weakness", "required_missing_weakness"],
  ["valid: replacement signatures only", "required_replacements"],
  [
    "valid: signatures and replacement signatures",
    "required_replacements_in_addition",
  ],
  ["valid: advanced signatures", "required_advanced_only"],
  [
    "valid: advanced signature and a signature weakness (after challenge scenario)",
    "required_advanced",
  ],
  ["valid: all possible signatures", "required_all"],
  ["valid: signatures with correct quantity", "required_quantity"],
  ["invalid: signatures with incorrect quantity", "required_quantity_invalid"],
  ["invalid: missing replacement signature", "required_replacements_invalid"],
  ["invalid: missing advanced signature", "required_advanced_invalid"],
  ["valid: reprinted signatures mixed with original", "mixed_signatures"],
  // Random basic weaknesses
  ["valid: random basic weakness present", "rbw"],
  [
    "valid: second stage of multi-stage random basic weakness present",
    "rbw_multistage",
  ],
  ["invalid: missing random basic weakness", "rbw_invalid_missing"],
  // Off-class access
  ["valid: dunwich off-class access", "dunwich"],
  ["invalid: too many dunwich off-class cards", "dunwich_invalid"],
  ["valid: off-class access with faction selection", "faction_select"],
  ["valid: faction selection with an option id", "faction_select_option_id"],
  [
    "invalid: off-class access with faction selection",
    "faction_select_invalid",
  ],
  ["valid: tag-based off-class access", "tag_based_access"],
  [
    "valid: tag-based access and versatile overlap",
    "tag_based_access_versatile",
  ],
  [
    "invalid: tag-based access and versatile overlap",
    "tag_based_access_versatile_invalid",
  ],
  ["invalid: tag-based off-class access", "tag_based_access_invalid"],
  ["valid: trait-based off-class access", "trait_based_access"],
  ["invalid: trait-based off-class access", "trait_based_access_invalid"],
  // Customizable cards
  ["valid: customizable level in investigator range", "customizable_level"],
  ["invalid: customizable level exceeded", "customizable_level_exceeded"],
  [
    "invalid: customizable level below investigator range",
    "customizable_level_below",
  ],
  // At least constraints
  ["valid: 'at least x cards of y factions' requirement", "atleast_factions"],
  [
    "invalid: 'at least x cards of y factions' requirement",
    "atleast_factions_invalid",
  ],
  // Deck size adjustments
  ["valid: Forced Learning with correct deck size", "forced_learning"],
  ["valid: Underworld Market with correct deck size", "underworld_market"],
  // Ancestral Knowledge
  [
    "valid: Ancestral Knowledge with at least 10 skill cards",
    "ancestral_knowledge",
  ],
  [
    "invalid: Ancestral Knowledge with less than 10 skill cards",
    "ancestral_knowledge_invalid",
  ],
  // Covenants
  ["valid: one Covenant", "covenant"],
  ["invalid: more than one Covenant", "covenant_invalid"],
  // Mandy Thompson
  ["valid: Mandy Thompson with deck size selected", "mandy"],
  ["valid: Mandy Thompson taboo forces deck size of 50", "mandy_taboo"],
  ["invalid: Mandy Thompson with too few cards", "mandy_too_few_cards"],
  ["invalid: Mandy Thompson with too many cards", "mandy_too_many_cards"],
  [
    "invalid: Mandy Thompson with too few signatures for deck size",
    "mandy_signature_count_invalid",
  ],
  // Underworld Support
  ["valid: Underworld Support with only singletons", "underworld_support"],
  [
    "valid: Underworld Support with more than one copy of a a weakness",
    "underworld_support_weaknesses",
  ],
  [
    "invalid: Underworld Support invalid deck size",
    "underworld_support_invalid_size",
  ],
  [
    "invalid: Underworld Support with more than one copy of a card",
    "underworld_support_invalid_deck_limit",
  ],
  [
    "invalid: Underworld Support with more than one copy of a myriad card",
    "underworld_support_invalid_myriad",
  ],
  // Honed Instinct
  [
    "valid: three copies Honed Instinct with Impulse Control unlocked",
    "honed_instinct",
  ],
  [
    "invalid: three copies Honed Instinct with Impulse Control not unlocked",
    "honed_instinct_invalid",
  ],
  // Versatile
  ["valid: Versatile with added off-class card", "versatile"],
  ["invalid: Versatile with too many off-class cards", "versatile_invalid"],
  // || Jenny
  ["valid: || Jenny Barnes with 10 off-class Talents", "parallel_jenny"],
  [
    "invalid: || Jenny Barnes with more than 10 off-class Talents",
    "parallel_jenny_invalid_limit",
  ],
  [
    "invalid: || Jenny Barnes with permanent Talents",
    "parallel_jenny_invalid_forbidden",
  ],
  // || Roland (front)
  ["valid: || Roland (front) with three Directives", "parallel_roland"],
  [
    "invalid: || Roland (front) with too many Directives",
    "parallel_roland_invalid",
  ],
  // || Wendy (front)
  ["valid: || Wendy (front) with Tidal Memento", "parallel_wendy_front"],
  [
    "invalid: || Wendy (front) without Tidal Memento",
    "parallel_wendy_front_invalid",
  ],
  // || Wendy (back)
  ["valid: || Wendy (back) valid for selected option", "parallel_wendy"],
  [
    "invalid: || Wendy (back) invalid for selected option",
    "parallel_wendy_invalid",
  ],
  // Precious Memento
  ["valid: Precious Memento with correct limits", "precious_memento"],
  [
    "invalid: Too many copies of a Precious Memento",
    "precious_memento_invalid",
  ],
  // On Your Own
  ["valid: On Your Own without allies in deck", "on_your_own"],
  ["valid: On Your Own with story ally in deck", "on_your_own_story_ally"],
  [
    "valid: On Your Own with Summoned Servitor, upgraded to lose ally slot",
    "on_your_own_summoned_servitor",
  ],
  ["invalid: On Your Own with ally in deck", "on_your_own_invalid"],
  [
    "invalid: On Your Own with Summoned Servitor occupying an ally slot",
    "on_your_own_summoned_servitor_invalid",
  ],
  // Transformed investigator
  ["valid: transformed investigator (Y'thian)", "transformed_investigator"],
  // Marie (promo)
  ["valid: Marie (promo) with promo signatures", "promo_marie"],
  ["invalid: Marie (promo) with missing signature", "promo_marie_invalid"],
  // Eldritch Brand
  ["valid: Eldritch Brand with a singleton attachment", "eldritch_brand"],
  [
    "invalid: Eldritch Brand with too many copies of an attachment",
    "eldritch_brand_invalid",
  ],
  // Lily Chen
  [
    "valid: Lily Chen with correct pairs of signatures and weaknesses",
    "lily_chen",
  ],
  [
    "invalid: Lily Chen with too few weaknesses",
    "lily_chen_invalid_too_few_weaknesses",
  ],
  [
    "invalid: Lily Chen with too many weaknesses",
    "lily_chen_invalid_too_many_weaknesses",
  ],
  // || Jim / Extra deck
  ["valid: extra deck with no error", "extra_deck"],
  ["invalid: extra deck with forbidden cards", "extra_deck_invalid_forbidden"],
  [
    "invalid: extra deck with too many copies of a card",
    "extra_deck_invalid_deck_limit",
  ],
  [
    "invalid: extra deck with too many cards",
    "extra_deck_invalid_size_exceeded",
  ],
  ["invalid: extra deck with too few cards", "extra_deck_invalid_size_below"],
  // Silas Marsh
  ["valid: Silas Marsh with cycle signatures", "silas_marsh"],
  [
    "valid: Silas Marsh with replacement signatures",
    "silas_marsh_replacements",
  ],
  // || Agnes
  ["valid: || Agnes with ignored duplicates", "parallel_agnes"],
  ["valid: || Agnes with card over deck_limit", "parallel_agnes_deck_limit"],
  [
    "invalid: || Agnes with card over deck_limit",
    "parallel_agnes_invalid_deck_limit",
  ],
  // Myriad
  ["valid: myriad cards with different subnames", "myriad_subname"],
  ["invalid: myriad cards with different subnames", "myriad_subname_invalid"],
  // Suzi
  ["valid: Suzi with valid 'at_least' constraint", "suzi"],
  [
    "invalid: Suzi with invalid 'at_least' constraint and forbidden card",
    "suzi_invalid",
  ],
  // || Lola
  ["valid: || Lola faction validation", "parallel_lola"],
  ["invalid: || Lola faction validation", "parallel_lola_invalid"],
  // Joe Diamond
  ["valid: at least x of trait", "atleast_traits_valid"],
  ["invalid: at least x of trait", "atleast_traits_invalid"],
  // Limited card pool
  [
    "valid: limited card pool with all cards in pool",
    "limited_card_pool_valid",
  ],
  [
    "valid: limited card pool with duplicate cards in pool",
    "limited_card_pool_valid_with_duplicates",
  ],
  [
    "invalid: limited card pool with cards not in pool",
    "limited_card_pool_invalid_cards_not_in_pool",
  ],
  [
    "invalid: limited card pool with upgraded cards not in pool",
    "limited_card_pool_invalid_upgraded_cards",
  ],
  [
    "invalid: limited card pool with side slots not in pool",
    "limited_card_pool_invalid_side_slots",
  ],
];

function validate(store: StoreApi<StoreState>, deck: Deck) {
  store.getState().cacheFanMadeContent([deck]);

  const state = store.getState();
  const metadata = selectMetadata(state);
  const lookupTables = selectLookupTables(state);

  return validateDeck(
    resolveDeck(
      {
        sharing: state.sharing,
        metadata,
        lookupTables,
      },
      selectLocaleSortingCollator(state),
      deck,
    ),
    metadata,
    lookupTables,
  );
}

describe("Deck Validation", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it.for(tests)("%s", async ([name, fileName]) => {
    const expectation = (name as string).startsWith("valid:");
    const deck = await import(
      `@/test/fixtures/decks/validation/${fileName}.json`
    );
    const result = validate(store, deck);
    expect(result.valid).toEqual(expectation);
    if (!expectation) expect(result.errors).toMatchSnapshot();
  });
});
