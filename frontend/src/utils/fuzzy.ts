import { isEmpty } from "./is-empty";
import { normalizeDiacritics } from "./normalize-diacritics";

export function fuzzyMatch(haystack: string[], needle: RegExp) {
  return haystack.some((part) => needle.test(prepareSearchText(part)));
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
