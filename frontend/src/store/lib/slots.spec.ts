import { describe, expect, it } from "vitest";
import { encodeExtraSlots } from "./slots";

describe("encodeExtraSlots", () => {
  it("encodes extra slots", () => {
    expect(encodeExtraSlots({ "09080": 1, "09081": 2, "09101": 3 })).toEqual(
      "09080,09081,09081,09101,09101,09101",
    );
  });
});
