import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { type Deck, DeckSchema } from "@/store/schemas/deck.schema";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from "../slices";
import { applyDeckEdits } from "./deck-edits";

const sampleDeck = {
  id: "cdd24868-e3f8-408b-a74f-513a8b10e368",
  name: "Parallel Agnes - Spell Recycling Engine",
  date_creation: "2024-02-20T21:59:49+00:00",
  date_update: "2024-03-23T09:39:43+00:00",
  description_md:
    "This deck focuses on supporting your team in almost all aspects (clueing, fighting, healing, etc.), making sure nobody on the team dies (including their Ally assets) while providing them a second chance to pass tests.\r\n<br><br>I've capped the XP to 22 so it's standalone-ready. (19 for standalone + 3 from [In the Thick of It](/card/08125)).  \r\n<br><br><b>How it Works: </b>: <br>\r\nPlay spells with reduced cost (Parallel Agnes' ability) and shuffle them back to the deck. After playing a spell, trigger the advanced [Heirloom of Hyperborea](/card/90018)'s reaction so you draw one card. Then, use your [Soothing Melody](/card/05314) to heal your lost health and sanity and to draw a card. This can trigger the Heirloom's reactive ability again. Rinse and repeat.\r\n<br><br><br><b> Strategy: </b> <br>\r\nYour primary goal is to find and play your [Hallowed Mirror](/card/54002) and your advanced [Heirloom of Hyperborea](/card/90018) as soon as you can as this is the bread and butter of this build. <br> <br>\r\nYou can do that by either trying to Mulligan for it, or by playing your [Backpack](/card/53011) as soon as you can. <br> <br>\r\nOnce it's done, the next objective is to thin out your deck until we reach the necessary amount of cards for the Recycle Engine.\r\n<br><br><br><b> Recycle Engine (Essentials) </b> <Br>\r\nIn the late game, your deck should ideally contain the following cards:\r\n<br><br>3 x [Soothing Melody](/card/05314) (Infinite Heal and Draw. This rivals both Carolyn and Vincent's healing capability.)<br>\r\n2 x [Spectral Razor](/card/10102) / [Read the Signs](/card/10101) (depending on what your team needs) <br>\r\n2 x [Ward of Protection  (2)](/card/03270) (Protect the team from nasty treacheries) <br>\r\n1 x [Time Warp](/card/03311) (\"Dormammu, I've come to bargain!\" It's always nice to see your teammate's reaction whenever you surprise them with this card.)<br> \r\n1 x [Hypnotic Gaze](/card/60423) (Taboo ver. is better since it can be any symbol, but the OG is still fine) <br>\r\n1 x [Deny Existence](/card/05032) (Protect yourself) <br>\r\n1 x [Counterspell](/card/04110) (Only if you're using the taboo version since it covers all symbols. The OG version is very limited.\r\n<br> <br>With your Recycle Engine in place, you'll only have to see your [nasty weakness](/card/01013) once and never have dead draws again.\r\n<br><br><br><b> Important Notes and Tips:</b> <br>\r\n1.) Ensure that your deck always has at least one card as it is not allowed to shuffle back a card to an empty deck. It is also not mandatory to trigger the advanced [Heirloom of Hyperborea](/card/90018)'s reaction.<br> <br>\r\n2.) When you use [Soothing Melody](/card/05314) on other investigators, they get healed but it is still you who gets to draw the card.<br> <br>\r\n3.) I suggest you  put the 2 traumas from [In the Thick of It](/card/08125) to health as you have higher HP and it can easily be healed by [Soothing Melody](/card/05314) and [Drain Essence](/card/10094).<br> <br>\r\n4.) Don't hesitate to use [David Renfield](/card/03112), you can easily kill him using Agnes' ability anyway. Just track the doom count.  <br> <br>\r\n5.) Feel free to swap your two upgraded [Spectral Razor](/card/06201) with two upgraded [Read the Signs](/card/06117) depending on your team's needs. You can have up to four copies of either card as it is allowed by Parallel Agnes' back.  <br> \r\n<br><br> <b> Situational Cards: </b><br>\r\n1.) [Alter Fate (1)](/card/04313) - For those scenarios with pesky attacment treacheries. Agnes doesn't need the Level 3 version as she can reduce the cost using her ability. <br> <br>\r\n2.)  [Four of Cups (1)](/card/05035) - Agnes already [fights](/card/06201) / [investigates](/card/06117) at 7. However, sometimes this is not enough for hard or expert difficulty so this can help boost your <span class=\"icon-willpower\"></span> <br> <br>\r\n3.) [Moonlight Ritual](/card/02267) - Has a nice combo with Cat Mask and [David Renfield](/card/03112). It's difficult to be consistent though especially if you don't have your Recycle Engine setup yet. <br> <Br>\r\n4.) [Blood Eclipse (3)](/card/04266) - The level 3 version lets you deal up to 5 damage at the cost of 5 HP. It's probably not the most optimal card, but it surely fits right into her Bad Blood theme. <br> <br>\r\n5.) [Deny Existence (5)](/card/05280) - Overpowered card for Parallel Agnes as you can probably imagine. Too bad it costs 5 exp though. I highly recommend getting this card if you're playing in a campaign or standalone with higher exp and have some luxury exp to spare.",
  user_id: 36535,
  investigator_code: "01004",
  investigator_name: "Agnes Baker",
  slots: {
    "10084": 1,
    "10094": 2,
    "10102": 2,
    "53011": 2,
    "54002": 1,
    "60423": 1,
    "90018": 1,
    "90019": 1,
    "01000": 1,
    "01088": 2,
    "02157": 1,
    "03112": 1,
    "03153": 1,
    "03270": 2,
    "03311": 1,
    "05032": 2,
    "06117": 2,
    "06201": 2,
    "07029": 1,
    "07032": 2,
    "08108": 1,
    "08116": 1,
    "08125": 1,
  },
  sideSlots: {
    "10101": 2,
    "53009": 1,
    "02267": 1,
    "04110": 1,
    "04266": 1,
    "05035": 1,
    "05280": 1,
    "08110": 1,
  },
  ignoreDeckLimitSlots: {
    "06201": 2,
  },
  version: "1.0",
  xp: null,
  xp_spent: null,
  xp_adjustment: 0,
  exile_string: null,
  taboo_id: null,
  meta: '{"alternate_front":"90017","alternate_back":"90017"}',
  tags: "solo multiplayer",
  previous_deck: null,
  next_deck: null,
};

const sampleEdits = {
  quantities: {
    sideSlots: {
      "05035": 0,
      "03025": 2,
    },
    slots: {
      "10102": 4,
      "06201": 0,
    },
    ignoreDeckLimitSlots: {
      "10102": 2,
    },
    extraSlots: {
      "10103": 1,
      "10104": 1,
    },
  },
  tags: "spells multiplayer",
  name: "Parallel Agnes - Spell Recycling Engine 2.0",
  investigatorFront: "01004",
  tabooId: 7,
  description_md: "Another description",
};

describe("deck edits", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("general", () => {
    it("applies general edits", () => {
      expect(
        applyDeckEdits(
          sampleDeck,
          sampleEdits as never,
          store.getState().metadata,
        ),
      ).toMatchInlineSnapshot(`
        {
          "date_creation": "2024-02-20T21:59:49+00:00",
          "date_update": "2024-03-23T09:39:43+00:00",
          "description_md": "Another description",
          "exile_string": null,
          "id": "cdd24868-e3f8-408b-a74f-513a8b10e368",
          "ignoreDeckLimitSlots": {
            "06201": 2,
            "10102": 2,
          },
          "investigator_code": "01004",
          "investigator_name": "Agnes Baker",
          "meta": "{"alternate_front":null,"alternate_back":"90017","extra_deck":"10103,10104"}",
          "name": "Parallel Agnes - Spell Recycling Engine 2.0",
          "next_deck": null,
          "previous_deck": null,
          "sideSlots": {
            "02267": 1,
            "03025": 2,
            "04110": 1,
            "04266": 1,
            "05280": 1,
            "08110": 1,
            "10101": 2,
            "53009": 1,
          },
          "slots": {
            "01000": 1,
            "01088": 2,
            "02157": 1,
            "03112": 1,
            "03153": 1,
            "03270": 2,
            "03311": 1,
            "05032": 2,
            "06117": 2,
            "06201": 0,
            "07029": 1,
            "07032": 2,
            "08108": 1,
            "08116": 1,
            "08125": 1,
            "10084": 1,
            "10094": 2,
            "10102": 4,
            "53011": 2,
            "54002": 1,
            "60423": 1,
            "90018": 1,
            "90019": 1,
          },
          "taboo_id": 7,
          "tags": "spells multiplayer",
          "user_id": 36535,
          "version": "1.0",
          "xp": null,
          "xp_adjustment": 0,
          "xp_spent": null,
        }
      `);
    });

    it("prunes removed cards when configured to", () => {
      const result = applyDeckEdits(
        sampleDeck,
        sampleEdits as never,
        store.getState().metadata,
        true,
      );

      expect(result.slots["06201"]).not.toBeDefined();
      expect(result.ignoreDeckLimitSlots?.["06201"]).not.toBeDefined();
    });
  });

  describe("customizations", () => {
    it("applies customization edits", () => {
      const deck = {
        id: 3907687,
        name: "The Adventures of Carolyn Fern",
        date_creation: "2024-06-02T14:33:31+00:00",
        date_update: "2024-06-02T14:35:10+00:00",
        description_md: "",
        user_id: null,
        investigator_code: "98010",
        investigator_name: "Carolyn Fern",
        slots: {
          "01000": 1,
          "05007": 1,
          "05008": 1,
          "09022": 2,
          "09040": 2,
          "09079": 2,
          "09101": 2,
        },
        sideSlots: [],
        ignoreDeckLimitSlots: null,
        version: "0.1",
        xp: null,
        xp_spent: null,
        xp_adjustment: 0,
        exile_string: null,
        taboo_id: null,
        meta: '{"cus_09022":"0|1,1|1,2|0","cus_09101":"0|0|Illicit,3|2","cus_09079":"0|0|intellect,1|1","cus_09040":"0|1,1|1,2|1"}',
        tags: "guardian",
        previous_deck: null,
        next_deck: null,
        problem: "invalid_cards",
      };

      const edits = {
        customizations: {
          "09040": {
            "0": {
              xp_spent: 1,
            },
            "1": {
              xp_spent: 0,
            },
            "2": {
              xp_spent: 0,
            },
          },
          "09022": {
            "2": {
              xp_spent: 1,
            },
          },
          "09079": {
            "2": {
              xp_spent: 0,
            },
            "4": {
              xp_spent: 2,
              selections: ["combat"],
            },
          },
          "09101": {
            "3": {
              xp_spent: 3,
            },
          },
        },
      };

      const result = applyDeckEdits(
        DeckSchema.parse(deck),
        edits as never,
        store.getState().metadata,
      );

      expect(result.meta).toMatchInlineSnapshot(
        `"{"cus_09022":"0|1,1|1,2|1","cus_09101":"0|0|Illicit,3|3","cus_09079":"0|0|intellect,1|1,2|0,4|2|combat","cus_09040":"0|1,1|0,2|0"}"`,
      );
    });

    it("keeps customizations for deleted cards by default", () => {
      const deck = {
        slots: {
          "01000": 1,
          "01006": 1,
          "01007": 1,
          "09022": 2,
        },
        meta: '{"cus_09022":"0|1,1|1"}',
      };

      const edits = {
        quantities: {
          slots: {
            "09022": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
      );

      expect(result.meta).toMatchInlineSnapshot(`"{"cus_09022":"0|1,1|1"}"`);
    });

    it("prunes customizations for deleted cards when configured", () => {
      const deck = {
        slots: {
          "01000": 1,
          "01006": 1,
          "01007": 1,
          "09022": 2,
        },
        meta: '{"cus_09022":"0|1,1|1"}',
      };

      const edits = {
        quantities: {
          slots: {
            "09022": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
        true,
      );

      expect(result.meta).toMatchInlineSnapshot(`"{}"`);
    });

    it("does not prune customizations if deck is an upgrade", () => {
      const deck = {
        slots: {
          "01000": 1,
          "01006": 1,
          "01007": 1,
          "09022": 2,
        },
        meta: '{"cus_09022":"0|1,1|1"}',
        previous_deck: 1234,
      };

      const edits = {
        quantities: {
          slots: {
            "09022": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
        true,
        {
          id: "1234",
          meta: '{"cus_09022":"0|1,1|0"}',
        } as Deck,
      );

      expect(result.meta).toMatchInlineSnapshot(`"{"cus_09022":"0|1,1|0"}"`);
    });
  });

  describe("attachments", () => {
    it("applies attachment additions", () => {
      const deck = {
        slots: {
          "01000": 1,
          "04006": 1,
          "04007": 1,
          "03264": 1,
          "09077": 1,
          "07305": 2,
          "02109": 2,
        },
        meta: '{"attachments_09077":null,"attachments_03264":null}',
      };

      const edits = {
        attachments: {
          "09077": {
            "07305": 2,
            "02109": 1,
          },
          "03264": {
            "02109": 1,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
      );

      expect(result.meta).toMatchInlineSnapshot(
        `"{"attachments_09077":"07305,07305,02109","attachments_03264":"02109"}"`,
      );
    });

    it("applies attachment removals", () => {
      const deck = {
        slots: {
          "01000": 1,
          "04006": 1,
          "04007": 1,
          "03264": 1,
          "09077": 1,
          "07305": 2,
          "02109": 2,
        },
        meta: '{"attachments_09077":"07305,07305,02109","attachments_03264":"02109"}',
      };

      const edits = {
        attachments: {
          "09077": {
            "07305": 1,
            "02109": 1,
          },
          "03264": {
            "02109": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
      );

      expect(result.meta).toMatchInlineSnapshot(
        `"{"attachments_09077":"07305,02109","attachments_03264":null}"`,
      );
    });

    it("prunes removed attachables when configured", () => {
      const deck = {
        slots: {
          "01000": 1,
          "04006": 1,
          "04007": 1,
          "03264": 1,
          "09077": 1,
          "07305": 2,
          "02109": 2,
        },
        meta: '{"attachments_09077":"07305,07305,02109","attachments_03264":"02109"}',
      };

      const edits = {
        quantities: {
          slots: {
            "09077": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
        true,
      );

      expect(result.meta).toMatchInlineSnapshot(
        `"{"attachments_03264":"02109"}"`,
      );
    });

    it("prunes removed attachments when configured", () => {
      const deck = {
        slots: {
          "01000": 1,
          "04006": 1,
          "04007": 1,
          "03264": 1,
          "09077": 1,
          "07305": 2,
          "02109": 2,
        },
        meta: '{"attachments_09077":"07305,07305,02109","attachments_03264":"02109"}',
      };

      const edits = {
        quantities: {
          slots: {
            "07305": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
        true,
      );

      expect(result.meta).toMatchInlineSnapshot(
        `"{"attachments_09077":"02109","attachments_03264":"02109"}"`,
      );
    });

    it("always adds required cards", () => {
      const deck = {
        slots: {
          "05002": 1,
          "05010": 1,
        },
        meta: "{}",
      };

      const edits = {
        attachments: {
          "05002": {},
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
      );

      expect(result.meta).toMatchInlineSnapshot(
        `"{"attachments_05002":"05010"}"`,
      );
    });

    it("handles corner case when both attachable and attachment are removed", () => {
      const deck = {
        meta: '{"card_pool":"rcore,core,dwlp,ptcp,tcup,tdep,ticp,eoep,tskp,rtnotz,rtdwl,rtptc,rttfa,rttcu,nat,har,win,jac,ste,tfap","attachments_09077":"51005,07305,07305,09075,09075,03195,03195,09073,04108"}',
        slots: {
          "51005": 2,
          "52005": 2,
          "60316": 2,
          "60326": 2,
          "01000": 1,
          "09009": 1,
          "09010": 1,
          "03031": 1,
          "09075": 2,
          "03195": 2,
          "09067": 2,
          "09074": 2,
          "06026": 3,
          "09077": 1,
          "09073": 1,
          "07305": 2,
          "04203": 1,
          "09065": 2,
          "03233": 2,
          "02229": 2,
          "04155": 2,
          "08111": 2,
          "06281": 2,
          "04108": 2,
          "04233": 2,
        },
      };

      const edits = {
        quantities: {
          slots: {
            "09077": 0,
            "03195": 0,
          },
        },
      };

      const result = applyDeckEdits(
        deck as never,
        edits as never,
        store.getState().metadata,
        true,
      );

      expect(result).toMatchInlineSnapshot(`
        {
          "meta": "{"card_pool":"rcore,core,dwlp,ptcp,tcup,tdep,ticp,eoep,tskp,rtnotz,rtdwl,rtptc,rttfa,rttcu,nat,har,win,jac,ste,tfap"}",
          "slots": {
            "01000": 1,
            "02229": 2,
            "03031": 1,
            "03233": 2,
            "04108": 2,
            "04155": 2,
            "04203": 1,
            "04233": 2,
            "06026": 3,
            "06281": 2,
            "07305": 2,
            "08111": 2,
            "09009": 1,
            "09010": 1,
            "09065": 2,
            "09067": 2,
            "09073": 1,
            "09074": 2,
            "09075": 2,
            "51005": 2,
            "52005": 2,
            "60316": 2,
            "60326": 2,
          },
        }
      `);
    });
  });
});
