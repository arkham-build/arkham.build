import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import { getChangeStats } from "./deck-upgrades";
import { resolveDeck } from "./resolve-deck";

const tests = [
  // Base cases
  ["Add lvl 0 cards", "add0"],
  ["Add story assets", "story"],
  ["Add myriad cards", "myriad"],
  ["Add exceptional card", "exceptional"],
  ["Add second copy of Versatile", "second_versatile"],
  ["Upgrade a lvl 0 card to lvl 1-5", "0_to_upgrade"],
  ["Upgrade a lvl 1-5 card to higher lvl 1-5 card", "from_to_upgrade"],
  ["Upgrade exceptional card", "exceptional_upgrade"],
  ["Increased deck size grants free lvl. 0 cards", "deck_size_adjust"],
  ["Upgrade into a permanent card", "permanent"],
  // Arcane Research
  ["Arcane Research: Apply one discount", "arcane_research"],
  ["Arcane Research: Apply two discounts", "arcane_research_second_copy"],
  // Failing test: ["Arcane Research:  Swap & Add", "arcane_research_swap"],
  // Down the Rabbit Hole
  ["Down the Rabbit Hole: Apply discounts", "dtrh"],
  [
    "Down the Rabbit Hole: Arcane Research is present, applying Down the Rabbit Hole first is cheaper",
    "arcane_research_dtrh",
  ],
  [
    "Down the Rabbit Hole: Arcane Research is present, applying Arcane Research first is cheaper",
    "arcane_research_dtrh_alt",
  ],
  [
    "Down the Rabbit Hole: Apply penalty when adding lvl. 0 cards",
    "dtrh_penalty_level_0",
  ],
  [
    "Down the Rabbit Hole: Apply penalty when adding lvl. 0 customizable",
    "dtrh_penalty_level_0_customizable",
  ],
  [
    "Down the Rabbit Hole: Apply penalty to Myriad cards",
    "dtrh_penalty_myriad",
  ],
  ["Down the Rabbit Hole: Apply penalty to exiled cards", "dtrh_penalty_exile"],
  // Adaptable
  ["Adaptable: Apply swap", "adaptable"],
  ["Adaptable: Apply swap to Myriad cards", "adaptable_myriad"],
  [
    "Adaptable: Apply swap to Myriad cards with Down the Rabbit Hole present",
    "adaptable_myriad_dtrh",
  ],
  ["Adaptable: Apply swap to chained / unchained cards", "adaptable_taboo"],
  // Customizable
  [
    "Customizable: Purchase new cards with and without checks",
    "customizable_purchase",
  ],
  [
    "Customizable: Purchase additional copies of cards",
    "customizable_additional_copies",
  ],
  ["Customizable: Upgrade cards", "customizable_upgrade"],
  [
    "Customizable: Apply Down the Rabbit Hole discount to upgrades",
    "customizable_dtrh_upgrade",
  ],
  [
    "Customizable: Apply Down the Rabbit Hole penalty to purchases",
    "customizable_dtrh_purchase",
  ],
  ["Customizable: Checkbox removals", "customizable_xp_removed"],
  // Duplicates
  ["Duplicates: Add duplicate upgrade", "duplicate_add"],
  ["Duplicates: Swap in duplicate", "duplicate_swap"],
  // Exile
  ["Exile: Repurchase without discounts", "exile_repurchase"],
  ["Exile: Replace with lvl. 0 cards", "exile_level_0"],
  [
    "Exile: Repurchase cards exiled by Burn After Reading",
    "exile_burn_after_reading",
  ],
  ["Exile: Apply Deja Vu discount", "exile_deja_vu"],
  ["Exile: Apply Deja Vu discount to singles", "exile_deja_vu_singles"],
  ["Exile: Apply 2x copies of Deja Vu discount", "exile_deja_vu_multiple"],
  [
    "Exile: Don't apply Deja Vu discount to different levels of same card",
    "exile_deja_vu_level_diff",
  ],
  ["Exile: Repurchase level 0 customizable", "exile_customizable_level_0"],
  ["Exile: Repurchase customizable upgrades", "exile_customizable_upgrades"],
  [
    "Exile: Apply Adaptable discounts after repurchasing exiled cards",
    "exile_adaptable",
  ],
  // Parallel Jim
  ["Extra Deck: Upgrade cards", "extra_deck_upgrade"],
  [
    "Extra Deck: Swapping cards in extra deck when adding Versatile in the same upgrade",
    "extra_deck_versatile",
  ],
  ["Extra deck: Repurchasing exiled card", "extra_deck_exile"],
  // Parallel Agnes / Skids
  ["Add cards that 'ignore deck limit'", "ignore_deck_limit"],
  [
    "Add cards that 'ignore deck limit' with Arcane Research & Down the Rabbit Hole present",
    "ignore_deck_limit_discounts",
  ],
  // Other special cases
  ["Add campaign card that 'ignore deck limit'", "ignore_deck_limit_campaign"],
  [
    "Does not error with negative quantity of cards in deck",
    "negative_quantity",
  ],
  [
    "Upgrade a card with subname x to two cards with subnames y and z",
    "one_to_many_subnames",
  ],
];

describe("getChangeStats", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it.for(tests)("[Deck Upgrades] %s", async ([, name]) => {
    const state = store.getState();
    const lookupTables = selectLookupTables(state);
    const collator = selectLocaleSortingCollator(state);

    const resolveFixture = async (fileName: string) => {
      const deck = await import(
        `@/test/fixtures/decks/upgrades/${fileName}.json`
      );
      return resolveDeck(
        { metadata: state.metadata, lookupTables, sharing: state.sharing },
        collator,
        deck,
      );
    };

    const [prev, next] = await Promise.all([
      resolveFixture(`${name}_1`),
      resolveFixture(`${name}_2`),
    ]);
    expect(getChangeStats(prev, next).xpSpent).toEqual(next.xp);
  });
});
