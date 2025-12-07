import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from "../slices";
import { applyCardChanges } from "./card-edits";

describe("applyCardChanges", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("taboo", () => {
    it("should return the original card if tabooSetId is nul-ish", () => {
      const state = store.getState();
      const card = state.metadata.cards["02002"];
      const result = applyCardChanges(card, state.metadata, null, undefined);
      expect(result).toEqual(card);
    });

    it("should return the original card if tabooSetId is 0", () => {
      const state = store.getState();
      const card = state.metadata.cards["02002"];
      const result = applyCardChanges(card, state.metadata, 0, undefined);
      expect(result).toEqual(card);
    });

    it("should return the original card if tabooSetId was not found", () => {
      const state = store.getState();
      const card = state.metadata.cards["02002"];
      const result = applyCardChanges(card, state.metadata, 99, undefined);
      expect(result).toEqual(card);
    });

    it("should return a tabood card if tabooSetId is present", () => {
      const state = store.getState();
      const card = state.metadata.cards["02002"];
      const result = applyCardChanges(card, state.metadata, 1, undefined);
      expect(result.real_taboo_text_change).toBeDefined();
    });

    it("should apply taboos for the latest taboo set", () => {
      const state = store.getState();
      const card = state.metadata.cards["02002"];
      const result = applyCardChanges(card, state.metadata, 6, undefined);
      expect(result.real_text).not.toEqual(card.real_text);
    });
  });

  describe("customizations", () => {
    it("should return the original card if card is not customizable", () => {
      const state = store.getState();
      const card = state.metadata.cards["02002"];
      const customizations = {
        [card.code]: {},
      };
      const result = applyCardChanges(
        card,
        state.metadata,
        null,
        customizations,
      );
      expect(result).toEqual(card);
    });

    it("should return the original card if customizations is undefined", () => {
      const state = store.getState();
      const card = state.metadata.cards["09040"];
      const result = applyCardChanges(card, state.metadata, null, undefined);
      expect(result).toEqual(card);
    });

    it("should return the original card if customizations is undefined", () => {
      const state = store.getState();
      const card = state.metadata.cards["09040"];
      const result = applyCardChanges(card, state.metadata, null, undefined);
      expect(result).toEqual(card);
    });

    it("calculates customization_xp", () => {
      const state = store.getState();
      const card = state.metadata.cards["09021"];
      const result = applyCardChanges(card, state.metadata, null, {
        [card.code]: {
          1: {
            index: 1,
            xp_spent: 1,
          },
          2: {
            index: 2,
            xp_spent: 2,
          },
        },
      });

      expect(result.customization_xp).toEqual(3);
    });

    it("applies health and sanity changes", () => {
      const state = store.getState();
      const card = state.metadata.cards["09021"];
      const result = applyCardChanges(card, state.metadata, null, {
        [card.code]: {
          2: {
            index: 2,
            xp_spent: 2,
          },
          3: {
            index: 3,
            xp_spent: 2,
          },
        },
      });
      expect(result).toMatchObject({
        health: (card.health as number) + 2,
        sanity: (card.sanity as number) + 2,
      });
    });

    it("applies deck_limit changes", () => {
      const state = store.getState();
      const card = state.metadata.cards["09081"];

      const result = applyCardChanges(card, state.metadata, null, {
        [card.code]: {
          7: {
            index: 7,
            xp_spent: 3,
          },
        },
      });

      expect(card.deck_limit).not.toEqual(result.deck_limit);
      expect(result.deck_limit).toEqual(3);
    });

    it("applies slot and trait changes", () => {
      const state = store.getState();
      const card = state.metadata.cards["09021"];

      const result = applyCardChanges(card, state.metadata, null, {
        [card.code]: {
          0: {
            index: 0,
            xp_spent: 1,
          },
        },
      });

      expect(card.real_slot).not.toEqual(result.real_slot);
      expect(card.real_traits).not.toEqual(result.real_traits);
      expect(result.real_traits?.includes("Relic")).toBeTruthy();
      expect(result.real_slot).toEqual("Arcane");
    });

    it("applies cost changes", () => {
      const state = store.getState();
      const card = state.metadata.cards["09022"];

      const result = applyCardChanges(card, state.metadata, null, {
        [card.code]: {
          0: {
            index: 0,
            xp_spent: 1,
          },
        },
      });

      expect(card.cost).not.toEqual(result.cost);
      expect(result.cost).toEqual(3);
    });

    it("applies tag changes", () => {
      const state = store.getState();
      const card = state.metadata.cards["09040"];

      const result = applyCardChanges(card, state.metadata, null, {
        [card.code]: {
          0: {
            index: 0,
            xp_spent: 1,
          },
          1: {
            index: 1,
            xp_spent: 1,
          },
        },
      });

      expect(card.tags?.length).not.toEqual(result.tags?.length);
      expect(result.tags?.includes("hd")).toBeTruthy();
      expect(result.tags?.includes("hh")).toBeTruthy();
    });
  });

  it("applies remove_slot choice", () => {
    const state = store.getState();
    const card = state.metadata.cards["09080"];

    const result = applyCardChanges(card, state.metadata, null, {
      [card.code]: {
        5: {
          index: 5,
          xp_spent: 2,
          selections: "0",
        },
      },
    });

    expect(result.real_slot).not.toEqual(card.real_slot);
    expect(result.real_slot).toEqual("Arcane");
  });

  it("appends and insert text changes correctly", () => {
    const state = store.getState();
    const card = state.metadata.cards["09041"];

    const result = applyCardChanges(card, state.metadata, null, {
      [card.code]: {
        1: {
          index: 1,
          xp_spent: 1,
        },
        6: {
          index: 6,
          xp_spent: 3,
        },
      },
    });

    expect(result.real_text).not.toEqual(card.real_text);
    expect(result.real_text).toMatchInlineSnapshot(`
      "Customizable. Limit 1 per investigator.
      <b>Forced</b> - At the start of the round: Choose one of the following criteria for this round
      - You fail a test by 2 or more.
      - You succeed at a test by 3 or more.
      - You are dealt damage or horror.
      When the chosen criteria is met, you may exhaust Empirical Hypothesis to add 1 evidence to it.
      [fast] Spend 1 evidence: Draw 1 card.
      [fast] Spend 3 evidence: Discover 1 clue at your location."
    `);
  });

  it("replaces text changes correctly", () => {
    const state = store.getState();
    const card = state.metadata.cards["09040"];

    const result = applyCardChanges(card, state.metadata, null, {
      [card.code]: {
        4: {
          index: 4,
          xp_spent: 2,
        },
        5: {
          index: 5,
          xp_spent: 3,
        },
        6: {
          index: 6,
          xp_spent: 5,
        },
      },
    });

    expect(result.real_text).not.toEqual(card.real_text);
    expect(result.real_text).toMatchInlineSnapshot(`
      "Customizable. Uses (5 supplies).
      [action] Spend 1 supply: Choose an investigator at your location and test [intellect] (1). If you succeed, that investigator performs one of the following options (2 options instead if you succeed by 2 or more) -
      - Draw 2 cards.
      - Gain 2 resources."
    `);
  });

  it("applies trait choices", () => {
    const state = store.getState();
    const card = state.metadata.cards["09101"];

    const result = applyCardChanges(card, state.metadata, null, {
      [card.code]: {
        0: {
          index: 0,
          xp_spent: 0,
          selections: "Innate^Expert",
        },
        1: {
          index: 1,
          xp_spent: 1,
          selections: "Practiced",
        },
      },
    });

    expect(result.real_text).not.toEqual(card.real_text);
    expect(result.real_text).toMatchInlineSnapshot(`
      "Customizable. Traits chosen: [[Innate]], [[Expert]]
      Additional Trait:  [[Practiced]]
      If this is a skill test on or against an encounter card <i>(including fighting, evading, or parleying)</i>, Grizzled gains [wild][wild] for each of the chosen traits that encounter card possesses."
    `);
  });

  it("applies card choices", () => {
    const state = store.getState();
    const card = state.metadata.cards["09042"];

    const result = applyCardChanges(card, state.metadata, null, {
      [card.code]: {
        0: {
          index: 0,
          xp_spent: 0,
          selections: "07017",
        },
        4: {
          index: 4,
          xp_spent: 2,
          selections: "01042^08045",
        },
      },
    });

    expect(result.real_text).not.toEqual(card.real_text);
    expect(result.real_text).toMatchInlineSnapshot(`
      "Customizable. When you purchase The Raven Quill, name a [[Tome]] or [[Spell]] asset and record that name on its upgrade sheet.
      Named asset: <u>Book of Psalms</u>
      Additional named assets: <u>Encyclopedia</u>, <u>Prophesiae Profana</u>
      Attach to a named asset you control.
      [reaction] When you resign or the game ends: Either mark a checkbox on The Raven Quill's upgrade sheet, or reduce the experience cost to upgrade the attached asset before the next scenario by 1."
    `);
  });

  it("applies skill choices", () => {
    const state = store.getState();
    const card = state.metadata.cards["09079"];

    const result = applyCardChanges(card, state.metadata, null, {
      [card.code]: {
        0: {
          index: 0,
          xp_spent: 0,
          selections: "willpower",
        },
        4: {
          index: 4,
          xp_spent: 2,
          selections: "intellect",
        },
        5: {
          index: 5,
          xp_spent: 3,
          selections: "agility",
        },
      },
    });

    expect(result.real_text).not.toEqual(card.real_text);
    expect(result.real_text).toMatchInlineSnapshot(`
      "Customizable. Chosen skill: [willpower]
      Additional skill: [intellect]
      Additional skill: [agility]
      Uses (3 charges).
      Remove 1 charge from Living Ink at the start of each of your turns. If Living Ink has no charges, discard it.
      You get +1 to the chosen skill(s)."
    `);
  });
});
