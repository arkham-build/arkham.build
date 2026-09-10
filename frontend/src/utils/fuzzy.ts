import { isEmpty } from "./is-empty";
import { normalizeDiacritics } from "./normalize-diacritics";

const DEFAULT_CACHE_LIMIT = 50_000;

export class SearchTextCache {
  private cache = new Map<string, string>();

  constructor(private limit = DEFAULT_CACHE_LIMIT) {}

  prepare(str: string) {
    const cached = this.cache.get(str);
    if (cached != null) return cached;

    if (this.cache.size >= this.limit) {
      this.cache.clear();
    }

    const prepared = prepareSearchText(str);
    this.cache.set(str, prepared);

    return prepared;
  }
}

export function fuzzyMatch(
  haystack: string[],
  needle: RegExp,
  searchTextCache?: SearchTextCache,
) {
  return haystack.some((part) =>
    needle.test(searchTextCache?.prepare(part) ?? prepareSearchText(part)),
  );
}

export function prepareSearchText(str: string) {
  return normalizeDiacritics(str).trim();
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * When searching, the maximum distance between two parts of the search to be considered a match.
 * This makes search like `+1 [willpower]` work (for the most part).
 * 20 chars to accomodate "[...] at a skill test [...]".
 */
export function prepareNeedle(str: string, tokenDistance = 20) {
  const parts = prepareSearchText(str).split(/\s+/);
  if (isEmpty(parts)) return null;

  const expression = parts
    .map((part) => escapeRegex(part))
    .join(`.{0,${tokenDistance}}`);

  return new RegExp(expression, "iu");
}
