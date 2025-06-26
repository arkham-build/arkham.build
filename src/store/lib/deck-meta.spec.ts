import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import type { StoreState } from "@/store/slices";
import { getMockStore } from "@/test/get-mock-store";
import { decodeCustomizations, encodeCustomizations } from "./deck-meta";
import type { Customizations } from "./types";

const sampleCustomizations = JSON.parse(
  '{"cus_09079":"0|0|willpower,4|2|intellect,5|3|agility,1|1","cus_09080":"5|2|0,1|1,3|0","cus_09021":"2|2,0|1,3|2,1|1,4|2,5|0","cus_09081":"1|1,7|3","cus_09022":"0|1,1|1","cus_09042":"0|0|07159,2|1,4|2|07159^01031","cus_09101":"1|1|Practiced,0|0|Innate^Expert,2|0","cus_09061":"6|3","cus_09060":"0|0|Innate,5|2,2|2|Illicit,1|0,3|0","cus_09040":"4|2,1|1,0|1,5|4,6|5","cus_09041":"5|2,1|1"}',
);

describe("decodeCustomizations()", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("should decode customizations", () => {
    const state = store.getState();
    expect(
      decodeCustomizations(sampleCustomizations, state.metadata),
    ).toMatchInlineSnapshot(`
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
});

describe("encodeCustomizations()", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("encodes customizations", () => {
    const state = store.getState();
    const decoded = decodeCustomizations(sampleCustomizations, state.metadata);
    const encoded = encodeCustomizations(decoded as Customizations);

    for (const [key, value] of Object.entries(encoded)) {
      const a = value.split(",").sort();
      const b = sampleCustomizations[key].split(",").sort();
      expect(a.every((v, i) => v === b[i])).toBeTruthy();
    }
  });
});
