import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";

type Filterable = Card | ResolvedDeck;
export type Filter<T extends Filterable = Card> = (x: T) => boolean;

export function and<T extends Filterable = Card>(fns: Filter<T>[]) {
  return (element: T) => !fns.length || fns.every((f) => f(element));
}

export function or<T extends Filterable = Card>(fns: Filter<T>[]) {
  return (element: T) => !fns.length || fns.some((f) => f(element));
}

export function not<T extends Filterable = Card>(fn: Filter<T>): Filter<T> {
  return (element: T) => !fn(element);
}

export function notUnless<T extends Filterable = Card>(
  notFilter: Filter<T>,
  unlessFilters: Filter<T>[],
) {
  return (element: T) => {
    const unless = !!unlessFilters.length && or(unlessFilters)(element);
    return unless || not(notFilter)(element);
  };
}
