import { beforeAll, describe, expect, it } from "vitest";

import from0ToUpgrade from "@/test/fixtures/decks/upgrades/0_to_upgrade_1.json";
import from0ToUpgrade2 from "@/test/fixtures/decks/upgrades/0_to_upgrade_2.json";
import adaptable from "@/test/fixtures/decks/upgrades/adaptable_base_1.json";
import adaptable2 from "@/test/fixtures/decks/upgrades/adaptable_base_2.json";
import adaptableMyriad from "@/test/fixtures/decks/upgrades/adaptable_myriad_1.json";
import adaptableMyriad2 from "@/test/fixtures/decks/upgrades/adaptable_myriad_2.json";
import adaptableMyriadDtrh from "@/test/fixtures/decks/upgrades/adaptable_myriad_dtrh_1.json";
import adaptableMyriadDtrh2 from "@/test/fixtures/decks/upgrades/adaptable_myriad_dtrh_2.json";
import adaptableTaboo from "@/test/fixtures/decks/upgrades/adaptable_taboo_1.json";
import adaptableTaboo2 from "@/test/fixtures/decks/upgrades/adaptable_taboo_2.json";
import add0 from "@/test/fixtures/decks/upgrades/add0_1.json";
import add02 from "@/test/fixtures/decks/upgrades/add0_2.json";
import arcaneResearch from "@/test/fixtures/decks/upgrades/arcane_research_base_1.json";
import arcaneResearch2 from "@/test/fixtures/decks/upgrades/arcane_research_base_2.json";
import customizableDtrh from "@/test/fixtures/decks/upgrades/customizable_dtrh_1.json";
import customizableDtrh2 from "@/test/fixtures/decks/upgrades/customizable_dtrh_2.json";
import customizablePurchase from "@/test/fixtures/decks/upgrades/customizable_purchase_1.json";
import customizablePurchase2 from "@/test/fixtures/decks/upgrades/customizable_purchase_2.json";
import customizableUpgrade from "@/test/fixtures/decks/upgrades/customizable_upgrade_1.json";
import customizableUpgrade2 from "@/test/fixtures/decks/upgrades/customizable_upgrade_2.json";
import deckSize from "@/test/fixtures/decks/upgrades/deck_size_1.json";
import deckSize2 from "@/test/fixtures/decks/upgrades/deck_size_2.json";
import downTheRabbitHole from "@/test/fixtures/decks/upgrades/down_the_rabbit_hole_base_1.json";
import downTheRabbitHole2 from "@/test/fixtures/decks/upgrades/down_the_rabbit_hole_base_2.json";
import exceptional from "@/test/fixtures/decks/upgrades/exceptional_1.json";
import exceptional2 from "@/test/fixtures/decks/upgrades/exceptional_2.json";
import exceptional3 from "@/test/fixtures/decks/upgrades/exceptional_3.json";
import exileAdaptable1 from "@/test/fixtures/decks/upgrades/exile_adaptable_1.json";
import exileAdaptable2 from "@/test/fixtures/decks/upgrades/exile_adaptable_2.json";
import exileBase1 from "@/test/fixtures/decks/upgrades/exile_base_1.json";
import exileBurnAfterReading1 from "@/test/fixtures/decks/upgrades/exile_burn_after_reading_1.json";
import exileBurnAfterReading2 from "@/test/fixtures/decks/upgrades/exile_burn_after_reading_2.json";
import exileCustomizable from "@/test/fixtures/decks/upgrades/exile_customizable_1.json";
import exileCustomizable2 from "@/test/fixtures/decks/upgrades/exile_customizable_2.json";
import exileCustomizable2a from "@/test/fixtures/decks/upgrades/exile_customizable_2a.json";
import exileDejavu1 from "@/test/fixtures/decks/upgrades/exile_dejavu_1.json";
import exileDejavu2 from "@/test/fixtures/decks/upgrades/exile_dejavu_2.json";
import exileDejavu2a from "@/test/fixtures/decks/upgrades/exile_dejavu_2a.json";
import exileLevel02 from "@/test/fixtures/decks/upgrades/exile_level0_2.json";
import exileRepurchase2 from "@/test/fixtures/decks/upgrades/exile_repurchase_2.json";
import exileSingles from "@/test/fixtures/decks/upgrades/exile_singles_1.json";
import exileSingles2 from "@/test/fixtures/decks/upgrades/exile_singles_2.json";
import extraDeckBase from "@/test/fixtures/decks/upgrades/extra_deck_1.json";
import extraDeckExile from "@/test/fixtures/decks/upgrades/extra_deck_exile_1.json";
import extraDeckExile2 from "@/test/fixtures/decks/upgrades/extra_deck_exile_2.json";
import extraDeckUpgrade2 from "@/test/fixtures/decks/upgrades/extra_deck_upgrade_2.json";
import extraDeckVersatile2 from "@/test/fixtures/decks/upgrades/extra_deck_versatile_2.json";
import fromToUpgrade from "@/test/fixtures/decks/upgrades/from_to_upgrade_1.json";
import fromToUpgrade2 from "@/test/fixtures/decks/upgrades/from_to_upgrade_2.json";
import ignoreDeckLimit1 from "@/test/fixtures/decks/upgrades/ignore_deck_limit_1_1.json";
import ignoreDeckLimit2 from "@/test/fixtures/decks/upgrades/ignore_deck_limit_1_2.json";
import ignoreDeckLimit21 from "@/test/fixtures/decks/upgrades/ignore_deck_limit_2_1.json";
import ignoreDeckLimit22 from "@/test/fixtures/decks/upgrades/ignore_deck_limit_2_2.json";
import myriad from "@/test/fixtures/decks/upgrades/myriad_1.json";
import myriad2 from "@/test/fixtures/decks/upgrades/myriad_2.json";
import permanent from "@/test/fixtures/decks/upgrades/permanent_1.json";
import permanent2 from "@/test/fixtures/decks/upgrades/permanent_2.json";
import story from "@/test/fixtures/decks/upgrades/story_1.json";
import story2 from "@/test/fixtures/decks/upgrades/story_2.json";

import { getMockStore } from "@/test/get-mock-store";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { StoreApi } from "zustand";
import { StoreState } from "../slices";
import { getUpgradeStats } from "./deck-upgrades";
import { resolveDeck } from "./resolve-deck";

describe("getUpgradeStats", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("xp calculation", () => {
    it("handles case: add level 0", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, add0);
      const next = resolveDeck(state.metadata, state.lookupTables, add02);
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: 0 to 1-5", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        from0ToUpgrade,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        from0ToUpgrade2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: 1-5 to 1-5", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        fromToUpgrade,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        fromToUpgrade2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: story assets", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, story);
      const next = resolveDeck(state.metadata, state.lookupTables, story2);
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: myriad", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, myriad);
      const next = resolveDeck(state.metadata, state.lookupTables, myriad2);
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exceptional", () => {
      const state = store.getState();
      const first = resolveDeck(
        state.metadata,
        state.lookupTables,
        exceptional,
      );
      const second = resolveDeck(
        state.metadata,
        state.lookupTables,
        exceptional2,
      );
      const third = resolveDeck(
        state.metadata,
        state.lookupTables,
        exceptional3,
      );
      expect(getUpgradeStats(first, second).xpSpent).toEqual(second.xp);
      expect(getUpgradeStats(second, third).xpSpent).toEqual(third.xp);
    });

    it("handles case: arcane research", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        arcaneResearch,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        arcaneResearch2,
      );

      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);

      prev.slots[SPECIAL_CARD_CODES.ARCANE_RESEARCH] = 2;
      expect(getUpgradeStats(prev, next).xpSpent).toEqual((next.xp ?? 0) - 1);
    });

    it("handles case: down the rabbit hole", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        downTheRabbitHole,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        downTheRabbitHole2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: ignore deck limit", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        ignoreDeckLimit1,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        ignoreDeckLimit2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: down the rabbit hole + xp reduction", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        ignoreDeckLimit21,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        ignoreDeckLimit22,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: adaptable", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, adaptable);
      const next = resolveDeck(state.metadata, state.lookupTables, adaptable2);
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: adaptable + myriad", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        adaptableMyriad,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        adaptableMyriad2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: adaptable + myriad + down the rabbit hole", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        adaptableMyriadDtrh,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        adaptableMyriadDtrh2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: adaptable + taboo", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        adaptableTaboo,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        adaptableTaboo2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: deck size adjustment", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, deckSize);
      const next = resolveDeck(state.metadata, state.lookupTables, deckSize2);
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: permanent", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, permanent);
      const next = resolveDeck(state.metadata, state.lookupTables, permanent2);
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: customizable purchase", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        customizablePurchase,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        customizablePurchase2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: customizable upgrade", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        customizableUpgrade,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        customizableUpgrade2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: customizable + down the rabbit hole", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        customizableDtrh,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        customizableDtrh2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);

      delete prev.slots["09081"];
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(6);
    });

    it("handles case: exile, repurchase", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, exileBase1);
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileRepurchase2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, level 0 swaps", () => {
      const state = store.getState();
      const prev = resolveDeck(state.metadata, state.lookupTables, exileBase1);
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileLevel02,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, burn after reading", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileBurnAfterReading1,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileBurnAfterReading2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, deja vu", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileDejavu1,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileDejavu2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, deja vu (level difference)", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileDejavu1,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileDejavu2a,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, customizable", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileCustomizable,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileCustomizable2,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, customizable (lvl. 0)", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileCustomizable,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileCustomizable2a,
      );
      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile singles", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileSingles,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileSingles2,
      );

      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: exile, adaptable", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileAdaptable1,
      );

      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        exileAdaptable2,
      );

      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: extra deck, versatile", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        extraDeckBase,
      );
      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        extraDeckVersatile2,
      );

      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: extra deck, upgrades", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        extraDeckBase,
      );

      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        extraDeckUpgrade2,
      );

      expect(getUpgradeStats(prev, next).xpSpent).toEqual(next.xp);
    });

    it("handles case: extra deck, exile", () => {
      const state = store.getState();
      const prev = resolveDeck(
        state.metadata,
        state.lookupTables,
        extraDeckExile,
      );

      const next = resolveDeck(
        state.metadata,
        state.lookupTables,
        extraDeckExile2,
      );

      expect(getUpgradeStats(prev, next).xpSpent).toEqual(extraDeckExile2.xp);
    });
  });
});
