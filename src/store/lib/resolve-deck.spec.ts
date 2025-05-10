import deckCustomizable from "@/test/fixtures/decks/customizable.json";
import deckSizeAllSpecials from "@/test/fixtures/decks/deck_size_all_specials.json";
import deckSizeParallelAgnes from "@/test/fixtures/decks/deck_size_parallel_agnes.json";
import deckExtraSlots from "@/test/fixtures/decks/extra_slots.json";
import deckFactionSelected from "@/test/fixtures/decks/faction_select.json";
import deckInvestigatorOriginal from "@/test/fixtures/decks/investigator_original.json";
import deckInvestigatorParallelBack from "@/test/fixtures/decks/investigator_parallel_back.json";
import deckInvestigatorParallelBoth from "@/test/fixtures/decks/investigator_parallel_both.json";
import deckInvestigatorParallelFront from "@/test/fixtures/decks/investigator_parallel_front.json";
import deckInvestigatorReplacements from "@/test/fixtures/decks/investigator_replacement.json";
import deckMultiFactionSelected from "@/test/fixtures/decks/multi_faction_select.json";
import deckMyriadDifferentNames from "@/test/fixtures/decks/upgrades/dtrh_myriad_2.json";
import deckXpRequired from "@/test/fixtures/decks/xp_required.json";
import { getMockStore } from "@/test/get-mock-store";
import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import { resolveDeck } from "./resolve-deck";

// TODO: define and test revised core resolution.
describe("resolveDeck", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("alternate investigators", () => {
    it("resolves originals", () => {
      const state = store.getState();
      const deck = deckInvestigatorOriginal;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.investigatorFront.card.code).toEqual(
        deck.investigator_code,
      );
      expect(resolved.investigatorBack.card.code).toEqual(
        deck.investigator_code,
      );
    });

    it("resolves parallel front", () => {
      const state = store.getState();
      const deck = deckInvestigatorParallelFront;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.investigatorFront.card.code).toEqual(
        resolved.metaParsed.alternate_front,
      );
      expect(resolved.investigatorBack.card.code).toEqual(
        deck.investigator_code,
      );
    });

    it("resolves parallel back", () => {
      const state = store.getState();
      const deck = deckInvestigatorParallelBack;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.investigatorFront.card.code).toEqual(
        deck.investigator_code,
      );
      expect(resolved.investigatorBack.card.code).toEqual(
        resolved.metaParsed.alternate_back,
      );
    });

    it("resolves parallel front and back", () => {
      const state = store.getState();
      const deck = deckInvestigatorParallelBoth;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );

      expect(resolved.investigatorFront.card.code).toEqual(
        resolved.metaParsed.alternate_front,
      );

      expect(resolved.investigatorBack.card.code).toEqual(
        resolved.metaParsed.alternate_back,
      );
    });

    it("normalizes meta.alternate_* to the base card", () => {
      const state = store.getState();
      const deck = deckInvestigatorReplacements;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );

      expect(resolved.investigatorFront.card.code).toEqual(
        resolved.investigator_code,
      );

      expect(resolved.investigatorBack.card.code).toEqual(
        resolved.investigator_code,
      );
    });

    it("normalizes alt art investigator_code to the base card", () => {
      const state = store.getState();
      const deck = deckCustomizable;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(deck.investigator_code).toEqual("98010");
      expect(resolved.investigatorFront.card.code).toEqual("05001");
    });
  });

  describe("deck building", () => {
    it("parses selected faction if defined", () => {
      const state = store.getState();
      const deck = deckFactionSelected;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.selections).toMatchInlineSnapshot(`
        {
          "faction_selected": {
            "accessor": "faction_selected",
            "name": "Secondary Class",
            "options": [
              "guardian",
              "seeker",
              "survivor",
            ],
            "type": "faction",
            "value": "survivor",
          },
        }
      `);
    });

    it("parses multi faction selects if defined", () => {
      const state = store.getState();
      const deck = deckMultiFactionSelected;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.selections).toMatchInlineSnapshot(`
        {
          "faction_1": {
            "accessor": "faction_1",
            "name": "Class Choice",
            "options": [
              "guardian",
              "seeker",
              "rogue",
              "mystic",
              "survivor",
            ],
            "type": "faction",
            "value": "guardian",
          },
          "faction_2": {
            "accessor": "faction_2",
            "name": "Class Choice",
            "options": [
              "guardian",
              "seeker",
              "rogue",
              "mystic",
              "survivor",
            ],
            "type": "faction",
            "value": "survivor",
          },
        }
      `);
    });

    it("considers parallel back for deckbuilding", () => {
      const state = store.getState();

      // parallel wendy deck with "both" selected.
      const deck = deckInvestigatorParallelBack;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );

      expect(resolved.selections).toMatchInlineSnapshot(`
        {
          "option_selected": {
            "accessor": "option_selected",
            "name": "Trait Choice",
            "options": [
              {
                "id": "blessed",
                "level": {
                  "max": 5,
                  "min": 0,
                },
                "name": "Blessed",
                "trait": [
                  "blessed",
                ],
              },
              {
                "id": "cursed",
                "level": {
                  "max": 5,
                  "min": 0,
                },
                "name": "Cursed",
                "trait": [
                  "cursed",
                ],
              },
              {
                "id": "both",
                "level": {
                  "max": 5,
                  "min": 0,
                },
                "name": "Blessed and Cursed",
                "size": 5,
                "trait": [
                  "blessed",
                  "cursed",
                ],
              },
            ],
            "type": "option",
            "value": {
              "id": "both",
              "level": {
                "max": 5,
                "min": 0,
              },
              "name": "Blessed and Cursed",
              "size": 5,
              "trait": [
                "blessed",
                "cursed",
              ],
            },
          },
        }
      `);
    });
  });

  describe("deck size", () => {
    it("sums up total card count, excluding side deck", () => {
      const state = store.getState();
      const deck = deckSizeAllSpecials;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.stats.deckSizeTotal).toEqual(15);
    });

    it("calculates player card count correctly when replacement specials are used", () => {
      const state = store.getState();
      const deck = deckSizeAllSpecials;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.stats).toMatchObject({
        deckSize: 1,
        deckSizeTotal: 15,
      });
    });

    it("calculates player card count correctly for parallel agnes", () => {
      const state = store.getState();
      const deck = deckSizeParallelAgnes;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.stats).toMatchObject({
        deckSize: 2,
        deckSizeTotal: 9,
      });
    });

    it("calculates player card count correctly for parallel agnes when over deck_limit", () => {
      const state = store.getState();
      const deck = structuredClone(deckSizeParallelAgnes);
      deck.slots["02154"] = 4;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.stats).toMatchObject({
        deckSize: 4,
        deckSizeTotal: 11,
      });
    });
  });

  describe("extra deck", () => {
    it("parses the extra deck block", () => {
      const state = store.getState();
      const deck = deckExtraSlots;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.extraSlots).toMatchInlineSnapshot(`
        {
          "01018": 1,
          "01063": 1,
          "02020": 1,
          "03198": 1,
          "05155": 1,
          "06162": 1,
          "07111": 1,
          "08083": 1,
          "60410": 1,
          "90053": 1,
        }
      `);
    });

    it("adds the extra cards to the total deck size", () => {
      const state = store.getState();
      const deck = deckExtraSlots;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.stats.deckSizeTotal).toEqual(45);
    });
  });

  describe("customizable", () => {
    it("parses card customizations if present", () => {
      const state = store.getState();
      const deck = deckCustomizable;
      const resolved = resolveDeck(
        {
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      );
      expect(resolved.customizations).toMatchInlineSnapshot(`
        {
          "09021": {
            "0": {
              "index": 0,
              "selections": "",
              "xp_spent": 1,
            },
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
            "2": {
              "index": 2,
              "selections": "",
              "xp_spent": 2,
            },
            "3": {
              "index": 3,
              "selections": "",
              "xp_spent": 2,
            },
            "4": {
              "index": 4,
              "selections": "",
              "xp_spent": 2,
            },
            "5": {
              "index": 5,
              "selections": "",
              "xp_spent": 0,
            },
          },
          "09022": {
            "0": {
              "index": 0,
              "selections": "",
              "xp_spent": 1,
            },
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
          },
          "09040": {
            "0": {
              "index": 0,
              "selections": "",
              "xp_spent": 1,
            },
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
            "4": {
              "index": 4,
              "selections": "",
              "xp_spent": 2,
            },
            "5": {
              "index": 5,
              "selections": "",
              "xp_spent": 4,
            },
            "6": {
              "index": 6,
              "selections": "",
              "xp_spent": 5,
            },
          },
          "09041": {
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
            "5": {
              "index": 5,
              "selections": "",
              "xp_spent": 2,
            },
          },
          "09042": {
            "0": {
              "index": 0,
              "selections": "07159",
              "xp_spent": 0,
            },
            "2": {
              "index": 2,
              "selections": "",
              "xp_spent": 1,
            },
            "4": {
              "index": 4,
              "selections": "07159^01031",
              "xp_spent": 2,
            },
          },
          "09060": {
            "0": {
              "index": 0,
              "selections": "Innate",
              "xp_spent": 0,
            },
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 0,
            },
            "2": {
              "index": 2,
              "selections": "Illicit",
              "xp_spent": 2,
            },
            "3": {
              "index": 3,
              "selections": "",
              "xp_spent": 0,
            },
            "5": {
              "index": 5,
              "selections": "",
              "xp_spent": 2,
            },
          },
          "09061": {
            "6": {
              "index": 6,
              "selections": "",
              "xp_spent": 3,
            },
          },
          "09079": {
            "0": {
              "index": 0,
              "selections": "willpower",
              "xp_spent": 0,
            },
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
            "4": {
              "index": 4,
              "selections": "intellect",
              "xp_spent": 2,
            },
            "5": {
              "index": 5,
              "selections": "agility",
              "xp_spent": 3,
            },
          },
          "09080": {
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
            "3": {
              "index": 3,
              "selections": "",
              "xp_spent": 0,
            },
            "5": {
              "index": 5,
              "selections": "0",
              "xp_spent": 2,
            },
          },
          "09081": {
            "1": {
              "index": 1,
              "selections": "",
              "xp_spent": 1,
            },
            "7": {
              "index": 7,
              "selections": "",
              "xp_spent": 3,
            },
          },
          "09101": {
            "0": {
              "index": 0,
              "selections": "Innate^Expert",
              "xp_spent": 0,
            },
            "1": {
              "index": 1,
              "selections": "Practiced",
              "xp_spent": 1,
            },
            "2": {
              "index": 2,
              "selections": "",
              "xp_spent": 0,
            },
          },
        }
      `);
    });

    describe("experience", () => {
      it("calculates experience correctly (exceptional, taboos)", () => {
        const state = store.getState();
        const deck = deckXpRequired;
        const resolved = resolveDeck(
          {
            metadata: state.metadata,
            lookupTables: selectLookupTables(state),
            sharing: state.sharing,
          },
          selectLocaleSortingCollator(state),
          deck,
        );
        expect(resolved.stats).toMatchObject({
          xpRequired: 25,
        });
      });

      it("counts customizable experience", () => {
        const state = store.getState();
        const deck = deckCustomizable;
        const resolved = resolveDeck(
          {
            metadata: state.metadata,
            lookupTables: selectLookupTables(state),
            sharing: state.sharing,
          },
          selectLocaleSortingCollator(state),
          deck,
        );
        expect(resolved.stats).toMatchObject({
          xpRequired: 47,
        });
      });

      it("counts myriad with different names correctly", () => {
        const state = store.getState();
        const deck = deckMyriadDifferentNames;
        const resolved = resolveDeck(
          {
            metadata: state.metadata,
            lookupTables: selectLookupTables(state),
            sharing: state.sharing,
          },
          selectLocaleSortingCollator(state),
          deck,
        );
        expect(resolved.stats).toMatchObject({
          xpRequired: 2,
        });
      });
    });
  });
});
