export function isEmpty<T extends Array<unknown> | Record<string, unknown>>(
  x: T | null | undefined,
): x is null | undefined {
  if (x == null) return true;
  if (Array.isArray(x)) return x.length === 0;
  return Object.keys(x).length === 0;
}
