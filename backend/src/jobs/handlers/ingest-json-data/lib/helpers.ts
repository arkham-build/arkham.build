export function getInsertedId(
  idsByPosition: ReadonlyMap<number, number>,
  position: number,
  table: string,
) {
  const id = idsByPosition.get(position);

  if (id == null) {
    throw new Error(
      `Could not find inserted ${table} row at position ${position}`,
    );
  }

  return id;
}

export function uniqueStrings(values: readonly string[] | null | undefined) {
  return [...new Set(values ?? [])];
}
