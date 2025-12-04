export function omit<O extends Record<string, unknown>>(
  obj: O,
  filter: (key: string) => boolean,
): { [k: string]: unknown } {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !filter(key)),
  );
}
