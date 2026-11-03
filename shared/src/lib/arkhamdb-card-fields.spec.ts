import { describe, expect, it } from "vitest";
import {
  decodeDeckRequirements,
  decodeRestrictions,
} from "./arkhamdb-card-fields.ts";

describe("decodeRestrictions", () => {
  it.each([
    "trait:",
    "trait:   ",
    "faction:",
    "faction:   ",
    "investigator:",
    "investigator:   ",
    "investigator::01001",
    "investigator:01001:",
    "investigator:01001: :01002",
  ])("skips malformed restrictions: %s", (value) => {
    expect(decodeRestrictions(value)).toEqual({});
  });

  it("trims values and accepts custom investigator codes", () => {
    expect(
      decodeRestrictions(
        "investigator: custom-a : custom-b , trait: Custom Trait , faction: custom-faction ",
      ),
    ).toEqual({
      investigator: { "custom-a": "custom-a", "custom-b": "custom-b" },
      trait: ["Custom Trait"],
      faction: ["custom-faction"],
    });
  });

  it("merges investigators and keeps repeated traits and factions", () => {
    expect(
      decodeRestrictions(
        "investigator:01001:01002, trait:Blessed, faction:guardian, investigator:01003, trait:Relic, faction:seeker",
      ),
    ).toEqual({
      investigator: { "01001": "01001", "01002": "01002", "01003": "01003" },
      trait: ["Blessed", "Relic"],
      faction: ["guardian", "seeker"],
    });
  });
});

describe("decodeDeckRequirements", () => {
  it("returns an empty object for empty or unknown entries", () => {
    expect(decodeDeckRequirements("")).toEqual({});
    expect(decodeDeckRequirements("unknown:value, no-colon")).toEqual({});
  });

  it("decodes sizes, repeated random entries, and alternative cards", () => {
    const value =
      "size:30, random:subtype:basicweakness, random:trait:Madness, card:01006:90006, card:01007";
    const expected = {
      size: 30,
      random: [
        { target: "subtype", value: "basicweakness" },
        { target: "trait", value: "Madness" },
      ],
      card: {
        "01006": { "01006": "01006", "90006": "90006" },
        "01007": { "01007": "01007" },
      },
    };

    expect(decodeDeckRequirements(value)).toEqual(expected);
  });

  it("uses the last valid size and card entry", () => {
    expect(
      decodeDeckRequirements(
        "size:30, size:40, size:invalid, card:01006:90006, card:01006, card:01006:",
      ),
    ).toEqual({
      size: 40,
      card: { "01006": { "01006": "01006" } },
    });
  });

  it.each([
    "size:",
    "size:invalid",
    "size:30cards",
    "size:30.5",
    "size:-1",
    "size:Infinity",
    "size:9007199254740992",
    "random:",
    "random:subtype",
    "random:subtype:",
    "random::weakness",
    "random: :weakness",
    "random:subtype:basicweakness:extra",
    "card:",
    "card::01006",
    "card:01006:",
    "card:01006: :90006",
  ])("skips malformed requirements: %s", (value) => {
    expect(decodeDeckRequirements(value)).toEqual({});
  });
});
