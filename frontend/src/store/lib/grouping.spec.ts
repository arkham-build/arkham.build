import type { Card } from "@arkham-build/shared";
import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import { selectLocaleSortingCollator } from "../selectors/shared";
import type { StoreState } from "../slices";
import { getGroupedCards } from "./grouping";
import { sortByName } from "./sorting";

describe("getGroupedCards", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("groups by subtype", () => {
    const groupings = ["subtype" as const];

    const cards = [
      { subtype_code: "weakness", code: "1", real_name: "1" },
      { subtype_code: "weakness", code: "2", real_name: "2" },
      { subtype_code: "basicweakness", code: "3", real_name: "3" },
      { subtype_code: "basicweakness", code: "4", real_name: "4" },
      { subtype_code: "weakness", code: "5", real_name: "5" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "real_name": "1",
                "subtype_code": "weakness",
              },
              {
                "code": "2",
                "real_name": "2",
                "subtype_code": "weakness",
              },
              {
                "code": "5",
                "real_name": "5",
                "subtype_code": "weakness",
              },
            ],
            "key": "weakness",
            "type": "subtype",
          },
          {
            "cards": [
              {
                "code": "3",
                "real_name": "3",
                "subtype_code": "basicweakness",
              },
              {
                "code": "4",
                "real_name": "4",
                "subtype_code": "basicweakness",
              },
            ],
            "key": "basicweakness",
            "type": "subtype",
          },
        ],
        "hierarchy": {
          "basicweakness": {
            "count": 2,
            "key": "basicweakness",
            "parent": null,
            "type": "subtype",
          },
          "weakness": {
            "count": 3,
            "key": "weakness",
            "parent": null,
            "type": "subtype",
          },
        },
      }
    `);
  });

  it("groups by faction", () => {
    const groupings = ["faction" as const];

    const cards = [
      { faction_code: "guardian", code: "1", real_name: "1" },
      { faction_code: "mystic", code: "2", real_name: "2" },
      { faction_code: "guardian", code: "3", real_name: "3" },
      { faction_code: "mystic", code: "4", real_name: "4" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "faction_code": "guardian",
                "real_name": "1",
              },
              {
                "code": "3",
                "faction_code": "guardian",
                "real_name": "3",
              },
            ],
            "key": "guardian",
            "type": "faction",
          },
          {
            "cards": [
              {
                "code": "2",
                "faction_code": "mystic",
                "real_name": "2",
              },
              {
                "code": "4",
                "faction_code": "mystic",
                "real_name": "4",
              },
            ],
            "key": "mystic",
            "type": "faction",
          },
        ],
        "hierarchy": {
          "guardian": {
            "count": 2,
            "key": "guardian",
            "parent": null,
            "type": "faction",
          },
          "mystic": {
            "count": 2,
            "key": "mystic",
            "parent": null,
            "type": "faction",
          },
        },
      }
    `);
  });

  it("groups by cycle", () => {
    const groupings = ["cycle" as const];

    const cards = [
      { pack_code: "core", code: "1", real_name: "1" },
      { pack_code: "core", code: "2", real_name: "2" },
      { pack_code: "tmm", code: "3", real_name: "3" },
      { pack_code: "tmm", code: "4", real_name: "4" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "pack_code": "core",
                "real_name": "1",
              },
              {
                "code": "2",
                "pack_code": "core",
                "real_name": "2",
              },
            ],
            "key": "core",
            "type": "cycle",
          },
          {
            "cards": [
              {
                "code": "3",
                "pack_code": "tmm",
                "real_name": "3",
              },
              {
                "code": "4",
                "pack_code": "tmm",
                "real_name": "4",
              },
            ],
            "key": "dwl",
            "type": "cycle",
          },
        ],
        "hierarchy": {
          "core": {
            "count": 2,
            "key": "core",
            "parent": null,
            "type": "cycle",
          },
          "dwl": {
            "count": 2,
            "key": "dwl",
            "parent": null,
            "type": "cycle",
          },
        },
      }
    `);
  });

  it("groups by cost", () => {
    const groupings = ["cost" as const];

    const cards = [
      { cost: 0, code: "1", real_name: "1" },
      { cost: 0, code: "2", real_name: "2" },
      { cost: 1, code: "3", real_name: "3" },
      { cost: 1, code: "4", real_name: "4" },
      { cost: 2, code: "5", real_name: "4" },
      { cost: 0, code: "6", real_name: "6" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "cost": 0,
                "real_name": "1",
              },
              {
                "code": "2",
                "cost": 0,
                "real_name": "2",
              },
              {
                "code": "6",
                "cost": 0,
                "real_name": "6",
              },
            ],
            "key": "0",
            "type": "cost",
          },
          {
            "cards": [
              {
                "code": "3",
                "cost": 1,
                "real_name": "3",
              },
              {
                "code": "4",
                "cost": 1,
                "real_name": "4",
              },
            ],
            "key": "1",
            "type": "cost",
          },
          {
            "cards": [
              {
                "code": "5",
                "cost": 2,
                "real_name": "4",
              },
            ],
            "key": "2",
            "type": "cost",
          },
        ],
        "hierarchy": {
          "0": {
            "count": 3,
            "key": "0",
            "parent": null,
            "type": "cost",
          },
          "1": {
            "count": 2,
            "key": "1",
            "parent": null,
            "type": "cost",
          },
          "2": {
            "count": 1,
            "key": "2",
            "parent": null,
            "type": "cost",
          },
        },
      }
    `);
  });

  it("groups by type", () => {
    const groupings = ["type" as const];

    const cards = [
      { type_code: "asset", code: "1", real_name: "1" },
      { type_code: "asset", code: "2", real_name: "2" },
      { type_code: "event", code: "3", real_name: "3" },
      { type_code: "event", code: "4", real_name: "4" },
      { type_code: "skill", code: "5", real_name: "5" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "real_name": "1",
                "type_code": "asset",
              },
              {
                "code": "2",
                "real_name": "2",
                "type_code": "asset",
              },
            ],
            "key": "asset",
            "type": "type",
          },
          {
            "cards": [
              {
                "code": "3",
                "real_name": "3",
                "type_code": "event",
              },
              {
                "code": "4",
                "real_name": "4",
                "type_code": "event",
              },
            ],
            "key": "event",
            "type": "type",
          },
          {
            "cards": [
              {
                "code": "5",
                "real_name": "5",
                "type_code": "skill",
              },
            ],
            "key": "skill",
            "type": "type",
          },
        ],
        "hierarchy": {
          "asset": {
            "count": 2,
            "key": "asset",
            "parent": null,
            "type": "type",
          },
          "event": {
            "count": 2,
            "key": "event",
            "parent": null,
            "type": "type",
          },
          "skill": {
            "count": 1,
            "key": "skill",
            "parent": null,
            "type": "type",
          },
        },
      }
    `);
  });

  it("groups by level", () => {
    const groupings = ["level" as const];

    const cards = [
      { xp: 0, code: "1", real_name: "1" },
      { xp: 0, code: "2", real_name: "2" },
      { xp: 1, code: "3", real_name: "3" },
      { xp: 1, code: "4", real_name: "4" },
      { xp: 2, code: "5", real_name: "5" },
      { xp: 0, code: "6", real_name: "6" },
      { xp: null, code: "7", real_name: "7" },
      { xp: null, code: "8", real_name: "8" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "real_name": "1",
                "xp": 0,
              },
              {
                "code": "2",
                "real_name": "2",
                "xp": 0,
              },
              {
                "code": "6",
                "real_name": "6",
                "xp": 0,
              },
            ],
            "key": "0",
            "type": "level",
          },
          {
            "cards": [
              {
                "code": "3",
                "real_name": "3",
                "xp": 1,
              },
              {
                "code": "4",
                "real_name": "4",
                "xp": 1,
              },
            ],
            "key": "1",
            "type": "level",
          },
          {
            "cards": [
              {
                "code": "5",
                "real_name": "5",
                "xp": 2,
              },
            ],
            "key": "2",
            "type": "level",
          },
          {
            "cards": [
              {
                "code": "7",
                "real_name": "7",
                "xp": null,
              },
              {
                "code": "8",
                "real_name": "8",
                "xp": null,
              },
            ],
            "key": "none",
            "type": "level",
          },
        ],
        "hierarchy": {
          "0": {
            "count": 3,
            "key": "0",
            "parent": null,
            "type": "level",
          },
          "1": {
            "count": 2,
            "key": "1",
            "parent": null,
            "type": "level",
          },
          "2": {
            "count": 1,
            "key": "2",
            "parent": null,
            "type": "level",
          },
          "none": {
            "count": 2,
            "key": "none",
            "parent": null,
            "type": "level",
          },
        },
      }
    `);
  });

  it("groups by base vs. upgrades", () => {
    const groupings = ["base_upgrades" as const];

    const cards = [
      { xp: 0, code: "1", real_name: "1" },
      { xp: 0, code: "2", real_name: "2" },
      { xp: 1, code: "3", real_name: "3" },
      { xp: 1, code: "4", real_name: "4" },
      { xp: 2, code: "5", real_name: "5" },
      { xp: 0, code: "6", real_name: "6" },
      { xp: null, code: "7", real_name: "7" },
      { xp: null, code: "8", real_name: "8" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "real_name": "1",
                "xp": 0,
              },
              {
                "code": "2",
                "real_name": "2",
                "xp": 0,
              },
              {
                "code": "6",
                "real_name": "6",
                "xp": 0,
              },
              {
                "code": "7",
                "real_name": "7",
                "xp": null,
              },
              {
                "code": "8",
                "real_name": "8",
                "xp": null,
              },
            ],
            "key": "level0",
            "type": "base_upgrades",
          },
          {
            "cards": [
              {
                "code": "3",
                "real_name": "3",
                "xp": 1,
              },
              {
                "code": "4",
                "real_name": "4",
                "xp": 1,
              },
              {
                "code": "5",
                "real_name": "5",
                "xp": 2,
              },
            ],
            "key": "upgrade",
            "type": "base_upgrades",
          },
        ],
        "hierarchy": {
          "level0": {
            "count": 5,
            "key": "level0",
            "parent": null,
            "type": "base_upgrades",
          },
          "upgrade": {
            "count": 3,
            "key": "upgrade",
            "parent": null,
            "type": "base_upgrades",
          },
        },
      }
    `);
  });

  it("groups by encounter set", () => {
    const groupings = ["encounter_set" as const];

    const cards = [
      { encounter_code: "core", code: "1", real_name: "1" },
      { encounter_code: "core", code: "2", real_name: "2" },
      { encounter_code: "beast_thralls", code: "3", real_name: "3" },
      { encounter_code: "beast_thralls", code: "4", real_name: "4" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "encounter_code": "core",
                "real_name": "1",
              },
              {
                "code": "2",
                "encounter_code": "core",
                "real_name": "2",
              },
            ],
            "key": "core",
            "type": "encounter_set",
          },
          {
            "cards": [
              {
                "code": "3",
                "encounter_code": "beast_thralls",
                "real_name": "3",
              },
              {
                "code": "4",
                "encounter_code": "beast_thralls",
                "real_name": "4",
              },
            ],
            "key": "beast_thralls",
            "type": "encounter_set",
          },
        ],
        "hierarchy": {
          "beast_thralls": {
            "count": 2,
            "key": "beast_thralls",
            "parent": null,
            "type": "encounter_set",
          },
          "core": {
            "count": 2,
            "key": "core",
            "parent": null,
            "type": "encounter_set",
          },
        },
      }
    `);
  });

  it("groups by slot", () => {
    const groupings = ["slot" as const];

    const cards = [
      { real_slot: "Body", code: "1", real_name: "1" },
      { real_slot: "Body", code: "2", real_name: "2" },
      { real_slot: "Body", code: "3", real_name: "3" },
      { real_slot: "Hand", code: "4", real_name: "4" },
      { real_slot: "Hand", code: "5", real_name: "5" },
      { permanent: true, code: "6", real_name: "6" },
      { real_slot: null, code: "7", real_name: "7" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "4",
                "real_name": "4",
                "real_slot": "Hand",
              },
              {
                "code": "5",
                "real_name": "5",
                "real_slot": "Hand",
              },
            ],
            "key": "Hand",
            "type": "slot",
          },
          {
            "cards": [
              {
                "code": "1",
                "real_name": "1",
                "real_slot": "Body",
              },
              {
                "code": "2",
                "real_name": "2",
                "real_slot": "Body",
              },
              {
                "code": "3",
                "real_name": "3",
                "real_slot": "Body",
              },
            ],
            "key": "Body",
            "type": "slot",
          },
          {
            "cards": [
              {
                "code": "7",
                "real_name": "7",
                "real_slot": null,
              },
            ],
            "key": "none",
            "type": "slot",
          },
          {
            "cards": [
              {
                "code": "6",
                "permanent": true,
                "real_name": "6",
              },
            ],
            "key": "permanent",
            "type": "slot",
          },
        ],
        "hierarchy": {
          "Body": {
            "count": 3,
            "key": "Body",
            "parent": null,
            "type": "slot",
          },
          "Hand": {
            "count": 2,
            "key": "Hand",
            "parent": null,
            "type": "slot",
          },
          "none": {
            "count": 1,
            "key": "none",
            "parent": null,
            "type": "slot",
          },
          "permanent": {
            "count": 1,
            "key": "permanent",
            "parent": null,
            "type": "slot",
          },
        },
      }
    `);
  });

  it("handles nested groupings", () => {
    const groupings = ["faction" as const, "type" as const];

    const cards = [
      {
        faction_code: "guardian",
        type_code: "asset",
        code: "1",
        real_name: "1",
      },
      {
        faction_code: "guardian",
        type_code: "asset",
        code: "2",
        real_name: "2",
      },
      { faction_code: "mystic", type_code: "event", code: "3", real_name: "3" },
      { faction_code: "mystic", type_code: "event", code: "4", real_name: "4" },
      {
        faction_code: "guardian",
        type_code: "skill",
        code: "5",
        real_name: "5",
      },
      { faction_code: "mystic", type_code: "skill", code: "6", real_name: "6" },
    ] as Card[];

    const state = store.getState();
    const { metadata } = state;

    const result = getGroupedCards(
      groupings,
      cards,
      sortByName(selectLocaleSortingCollator(state)),
      metadata,
      selectLocaleSortingCollator(state),
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "data": [
          {
            "cards": [
              {
                "code": "1",
                "faction_code": "guardian",
                "real_name": "1",
                "type_code": "asset",
              },
              {
                "code": "2",
                "faction_code": "guardian",
                "real_name": "2",
                "type_code": "asset",
              },
            ],
            "key": "guardian|asset",
            "type": "faction|type",
          },
          {
            "cards": [
              {
                "code": "5",
                "faction_code": "guardian",
                "real_name": "5",
                "type_code": "skill",
              },
            ],
            "key": "guardian|skill",
            "type": "faction|type",
          },
          {
            "cards": [
              {
                "code": "3",
                "faction_code": "mystic",
                "real_name": "3",
                "type_code": "event",
              },
              {
                "code": "4",
                "faction_code": "mystic",
                "real_name": "4",
                "type_code": "event",
              },
            ],
            "key": "mystic|event",
            "type": "faction|type",
          },
          {
            "cards": [
              {
                "code": "6",
                "faction_code": "mystic",
                "real_name": "6",
                "type_code": "skill",
              },
            ],
            "key": "mystic|skill",
            "type": "faction|type",
          },
        ],
        "hierarchy": {
          "guardian": {
            "count": 3,
            "key": "guardian",
            "parent": null,
            "type": "faction",
          },
          "guardian|asset": {
            "count": 2,
            "key": "guardian|asset",
            "parent": "guardian",
            "type": "faction|type",
          },
          "guardian|skill": {
            "count": 1,
            "key": "guardian|skill",
            "parent": "guardian",
            "type": "faction|type",
          },
          "mystic": {
            "count": 3,
            "key": "mystic",
            "parent": null,
            "type": "faction",
          },
          "mystic|event": {
            "count": 2,
            "key": "mystic|event",
            "parent": "mystic",
            "type": "faction|type",
          },
          "mystic|skill": {
            "count": 1,
            "key": "mystic|skill",
            "parent": "mystic",
            "type": "faction|type",
          },
        },
      }
    `);
  });
});
