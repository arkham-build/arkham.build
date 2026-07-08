import type { Search } from "../slices/lists.types";

export type SearchFlagKey =
  | "includeBacks"
  | "includeFlavor"
  | "includeGameText"
  | "includeName";

export type SearchFlags = Pick<Search, SearchFlagKey>;

export const DEFAULT_SEARCH_FLAGS: SearchFlags = {
  includeBacks: false,
  includeFlavor: false,
  includeGameText: false,
  includeName: true,
};

const SEARCH_FLAG_PARAMS = [
  ["includeName", "name"],
  ["includeGameText", "text"],
  ["includeBacks", "back"],
  ["includeFlavor", "flavor"],
] as const satisfies readonly (readonly [SearchFlagKey, string])[];

export function parseSearchFlags(params: URLSearchParams): SearchFlags {
  const flags = { ...DEFAULT_SEARCH_FLAGS };

  for (const [flag, param] of SEARCH_FLAG_PARAMS) {
    const value = params.get(param);
    if (value != null) {
      flags[flag] = parseBooleanParam(value, DEFAULT_SEARCH_FLAGS[flag]);
    }
  }

  return flags;
}

export function setSearchFlagParams(
  params: URLSearchParams,
  flags: SearchFlags,
) {
  for (const [flag, param] of SEARCH_FLAG_PARAMS) {
    if (flags[flag] === DEFAULT_SEARCH_FLAGS[flag]) {
      params.delete(param);
    } else {
      params.set(param, flags[flag] ? "1" : "0");
    }
  }
}

function parseBooleanParam(value: string, defaultValue: boolean) {
  switch (value) {
    case "1":
    case "true":
      return true;
    case "0":
    case "false":
      return false;
    default:
      return defaultValue;
  }
}
