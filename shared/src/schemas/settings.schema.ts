import { z } from "zod";

export const COLLECTION_KEY_LIMIT = 5000;

export const CollectionSchema = z
  .record(z.string(), z.number())
  .refine((value) => Object.keys(value).length <= COLLECTION_KEY_LIMIT);
export type Collection = z.infer<typeof CollectionSchema>;

const GroupingTypeSchema = z.enum([
  "base_upgrades",
  "cost",
  "cycle",
  "encounter_set",
  "faction",
  "level",
  "none",
  "pack",
  "slot",
  "subtype",
  "type",
]);

const SortingTypeSchema = z.enum([
  "cost",
  "cycle",
  "faction",
  "level",
  "name",
  "position",
  "slot",
  "subtype",
  "type",
]);

export const ListConfigSchema = z.object({
  group: z.array(GroupingTypeSchema),
  sort: z.array(SortingTypeSchema),
  viewMode: z.enum([
    "compact",
    "card-text",
    "full-cards",
    "scans",
    "scans-grouped",
  ]),
});
export type ListConfig = z.infer<typeof ListConfigSchema>;

export const DecklistConfigSchema = z.object({
  group: z.array(GroupingTypeSchema),
  sort: z.array(SortingTypeSchema),
});
export type DecklistConfig = z.infer<typeof DecklistConfigSchema>;

export const STORAGE_PROVIDERS = ["local", "account", "arkhamdb"] as const;
export const StorageProviderSchema = z
  .enum(["local", "account", "shared", "arkhamdb"])
  .nullish();
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

export const SettingsSchema = z.object({
  cardLevelDisplay: z.enum(["icon-only", "dots", "text"]),
  cardListsDefaultContentType: z.enum(["fan-made", "official", "all"]),
  cardShowCollectionNumber: z.boolean().optional(),
  cardShowUniqueIcon: z.boolean().optional(),
  cardShowIcon: z.boolean(),
  cardShowDetails: z.boolean(),
  cardShowThumbnail: z.boolean(),
  cardSize: z.enum(["sm", "standard"]),
  cardSkillIconsDisplay: z.enum(["simple", "as_printed"]),
  collection: CollectionSchema,
  defaultEnvironment: z.enum(["current", "legacy"]),
  defaultStorageProvider: StorageProviderSchema,
  devModeEnabled: z.boolean(),
  flags: z.record(z.string(), z.boolean()).optional(),
  fontSize: z.number(),
  hideWeaknessesByDefault: z.boolean(),
  lists: z.object({
    encounter: ListConfigSchema,
    mixed: ListConfigSchema,
    investigator: ListConfigSchema,
    player: ListConfigSchema,
    deck: DecklistConfigSchema,
    deckScans: DecklistConfigSchema,
  }),
  locale: z.string(),
  notesEditor: z.object({
    defaultFormat: z.enum([
      "paragraph",
      "paragraph_colored",
      "header",
      "header_with_set",
    ]),
    defaultOrigin: z.enum(["deck", "usable", "player", "campaign"]),
  }),
  showAllCards: z.boolean(),
  showCardModalPopularDecks: z.boolean(),
  showMoveToSideDeck: z.boolean(),
  showPreviews: z.boolean(),
  sortIgnorePunctuation: z.boolean(),
  tabooSetId: z.union([z.number(), z.literal("latest")]).optional(),
  useLimitedPoolForWeaknessDraw: z.boolean(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const RemoteSettingsSchema = SettingsSchema.omit({
  collection: true,
  devModeEnabled: true,
  fontSize: true,
});
export type RemoteSettings = z.infer<typeof RemoteSettingsSchema>;
