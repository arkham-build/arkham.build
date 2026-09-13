import type { Search, ViewMode } from "../slices/lists.types";

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

export const DEFAULT_SEARCH_DISPLAY_MODE: ViewMode = "compact";

const SEARCH_DISPLAY_MODES = [
  "compact",
  "card-text",
  "full-cards",
  "scans",
  "scans-grouped",
] as const satisfies readonly ViewMode[];

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

export function parseSearchTabooSetId(
  params: URLSearchParams,
): number | null | undefined {
  if (!params.has("taboo_set")) return undefined;

  const value = params.get("taboo_set");
  // absence of a taboo set is encoded as null, this is distinct from undefined.
  if (!value) return null;
  if (!/^\d+$/.test(value)) return undefined;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function parseSearchDisplayMode(
  params: URLSearchParams,
): ViewMode | undefined {
  const value = params.get("display_mode");
  return SEARCH_DISPLAY_MODES.find((mode) => mode === value);
}

export function setSearchContextParams(
  params: URLSearchParams,
  options: {
    displayMode: ViewMode;
    matchDisplayMode: boolean;
    matchVisibleTaboo: boolean;
    tabooSetId: number | null | undefined;
  },
) {
  const { displayMode, matchDisplayMode, matchVisibleTaboo, tabooSetId } =
    options;

  if (matchVisibleTaboo) {
    params.set("taboo_set", tabooSetId?.toString() ?? "");
  } else {
    params.delete("taboo_set");
  }

  if (matchDisplayMode && displayMode !== DEFAULT_SEARCH_DISPLAY_MODE) {
    params.set("display_mode", displayMode);
  } else {
    params.delete("display_mode");
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
