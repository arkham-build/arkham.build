export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
};

export const cacheKeys = {
  all: ["cache"] as const,
  dataVersion: (locale: string) =>
    [...cacheKeys.all, "data-version", locale] as const,
};

export const legacyKeys = {
  all: ["legacy"] as const,
  deck: (type: string, id: number) =>
    [...legacyKeys.all, "deck", type, id] as const,
  faq: (code: string) => [...legacyKeys.all, "faq", code] as const,
  share: (id: string) => [...legacyKeys.all, "share", id] as const,
};

export const decklistKeys = {
  all: ["decklists"] as const,
  search: (search: string) => [...decklistKeys.all, search] as const,
  meta: (id: number) => [...decklistKeys.all, "meta", id] as const,
  popular: (scopeCode: string) =>
    [...decklistKeys.all, "popular", scopeCode] as const,
};

export const recommendationKeys = {
  all: ["recommendations"] as const,
  detail: (parts: readonly unknown[]) =>
    [...recommendationKeys.all, ...parts] as const,
};

export const fanMadeKeys = {
  all: ["fan-made"] as const,
  listings: () => [...fanMadeKeys.all, "listings"] as const,
  project: (bucketPath: string) =>
    [...fanMadeKeys.all, "project", bucketPath] as const,
  quickInstall: (idOrUrl: string) =>
    [...fanMadeKeys.all, "quick-install", idOrUrl] as const,
};

export const grimoireKeys = {
  all: ["grimoire"] as const,
  grimoire: () => [...grimoireKeys.all, "all"] as const,
  cardFaq: (code: string) =>
    [...grimoireKeys.all, "faq", "card", code] as const,
  cardErrata: (code: string) =>
    [...grimoireKeys.all, "errata", "card", code] as const,
};
