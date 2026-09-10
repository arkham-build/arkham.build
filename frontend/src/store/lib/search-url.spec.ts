import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_FLAGS,
  parseSearchFlags,
  setSearchFlagParams,
} from "./search-url";

describe("search URL", () => {
  it("decodes absent params as defaults", () => {
    expect(parseSearchFlags(new URLSearchParams())).toEqual(
      DEFAULT_SEARCH_FLAGS,
    );
  });

  it("omits default flag params", () => {
    const params = new URLSearchParams("q=shrivelling");

    setSearchFlagParams(params, DEFAULT_SEARCH_FLAGS);

    expect(params.toString()).toBe("q=shrivelling");
  });

  it("encodes only flag params that differ from defaults", () => {
    const params = new URLSearchParams("q=shrivelling");

    setSearchFlagParams(params, {
      includeBacks: true,
      includeFlavor: true,
      includeGameText: true,
      includeName: false,
    });

    expect(params.toString()).toBe(
      "q=shrivelling&name=0&text=1&back=1&flavor=1",
    );
  });

  it("decodes encoded flag params", () => {
    expect(
      parseSearchFlags(new URLSearchParams("name=0&text=1&back=1&flavor=1")),
    ).toEqual({
      includeBacks: true,
      includeFlavor: true,
      includeGameText: true,
      includeName: false,
    });
  });
});
