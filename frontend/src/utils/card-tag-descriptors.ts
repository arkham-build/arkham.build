export type CardTagDescriptor = {
  tag: string;
  global: boolean;
  deck: boolean;
};

export function buildCardTagDescriptors(
  code: string,
  deckCardTags: Record<string, string[]>,
  globalCardTags: Record<string, string[]>,
): CardTagDescriptor[] | undefined {
  const deckSet = new Set(deckCardTags[code] ?? []);
  const globalSet = new Set(globalCardTags[code] ?? []);
  const all = new Set([...deckSet, ...globalSet]);
  if (all.size === 0) return undefined;
  return Array.from(all).map((tag) => ({
    tag,
    deck: deckSet.has(tag),
    global: globalSet.has(tag),
  }));
}

export function buildAllCardTagDescriptors(
  deckCardTags: Record<string, string[]>,
  globalCardTags: Record<string, string[]>,
): Record<string, CardTagDescriptor[]> {
  const codes = new Set([
    ...Object.keys(deckCardTags),
    ...Object.keys(globalCardTags),
  ]);
  const result: Record<string, CardTagDescriptor[]> = {};
  for (const code of codes) {
    const descriptors = buildCardTagDescriptors(
      code,
      deckCardTags,
      globalCardTags,
    );
    if (descriptors) result[code] = descriptors;
  }
  return result;
}
