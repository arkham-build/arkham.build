export function omit(
  obj: Record<string, unknown>,
  filter: (key: string) => boolean,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !filter(key)),
  );
}
