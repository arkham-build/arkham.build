import type { Coded } from "./types";

/**
 * Transform an array of arkhamdb-json-data into a map { [code]: data }.
 */
export function mappedByCode<T extends Coded, S extends Coded = T>(
  arr: T[],
  mapper?: (t: T) => void,
) {
  return arr.reduce<{ [id: string]: S }>((acc, curr) => {
    if (mapper) mapper(curr);
    acc[curr.code] = curr as unknown as S;
    return acc;
  }, {});
}

export function mappedById<T extends { id: number }>(arr: T[]) {
  return arr.reduce<Record<string, T>>((acc, curr) => {
    acc[curr.id] = curr;
    return acc;
  }, {});
}
