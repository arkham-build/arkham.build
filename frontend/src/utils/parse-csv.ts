export function parseCsv(txt: string): Record<string, unknown>[] {
  const lines = txt.split("\n").filter((l) => l);

  const header = lines.shift();
  if (!header) return [];

  const fields = header.split(",");

  return lines.map((line) => {
    const values = line.split(",");

    return fields.reduce<Record<string, unknown>>((acc, curr, i) => {
      const value = values[i];
      if (value) acc[curr] = value;
      return acc;
    }, {});
  });
}
