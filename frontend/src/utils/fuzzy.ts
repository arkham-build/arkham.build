import { isEmpty } from "./is-empty";
import { normalizeDiacritics } from "./normalize-diacritics";

export function fuzzyMatch(haystack: string[], needle: RegExp) {
  return haystack.some((part) => needle.test(prepare(part)));
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function prepare(str: string) {
  return normalizeDiacritics(str).trim();
}

/**
 * When searching, the maximum distance between two parts of the search to be considered a match.
 * This makes search like `+1 [willpower]` work (for the most part).
 * 20 chars to accomodate "[...] at a skill test [...]".
 */
export function prepareNeedle(str: string, tokenDistance = 20) {
  const parts = prepare(str).split(/\s+/);
  if (isEmpty(parts)) return null;

  const expression = parts
    .map((part) => escapeRegex(part))
    .join(`.{0,${tokenDistance}}`);

  return new RegExp(expression, "iu");
}
