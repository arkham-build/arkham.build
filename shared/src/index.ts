/** biome-ignore-all lint/performance/noBarrelFile: TECH DEBT: look into `exports` */
export {
  type ArkhamDBIdentity,
  ArkhamDBIdentitySchema,
  type ArkhamDbIdentityState,
  ArkhamDbIdentityStateSchema,
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  type CompleteProfileResponse,
  CompleteProfileResponseSchema,
  type CreateEmailIdentityRequest,
  CreateEmailIdentityRequestSchema,
  type EmailIdentity,
  EmailIdentitySchema,
  type ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
  type Identity,
  IdentitySchema,
  isArkhamDBIdentity,
  type LoginRequest,
  LoginRequestSchema,
  type OAuthIdentity,
  OAuthIdentitySchema,
  PATTERN_VALID_PASSWORD,
  PATTERN_VALID_USERNAME,
  type ResendVerificationRequest,
  ResendVerificationRequestSchema,
  type ResetPasswordRequest,
  ResetPasswordRequestSchema,
  type SessionResponse,
  SessionResponseSchema,
  type SignupRequest,
  SignupRequestSchema,
  type UpdateCredentialsRequest,
  UpdateCredentialsRequestSchema,
  type VerifyEmailRequest,
  VerifyEmailRequestSchema,
} from "./dtos/auth.schema.ts";
export {
  type DateRange,
  DateRangeSchema,
} from "./dtos/date-range.schema.ts";
export {
  DECK_BATCH_TARGET_LIMIT,
  type DeckBatchRequest,
  DeckBatchRequestSchema,
  type DeckBatchResponse,
  DeckBatchResponseSchema,
  type DeckConflictResponse,
  DeckConflictResponseSchema,
  type DeckDeleteRequest,
  DeckDeleteRequestSchema,
  type DeckManifestItem,
  DeckManifestItemSchema,
  type DeckManifestResponse,
  DeckManifestResponseSchema,
  type DeckSyncTarget,
  DeckSyncTargetSchema,
  type DeckUpdateRequest,
  DeckUpdateRequestSchema,
  type DeckUpgradeRequest,
  DeckUpgradeRequestSchema,
  type DeckWritePayload,
  DeckWritePayloadSchema,
  type SyncedDeckProvider,
  SyncedDeckProviderSchema,
} from "./dtos/deck-sync.schema.ts";
export {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "./dtos/decklist-meta-response.schema.ts";
export {
  DECKLIST_SEARCH_CARD_FILTER_LIMIT,
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
} from "./dtos/decklist-search-request.schema.ts";
export {
  type DecklistSearchResponse,
  DecklistSearchResponseSchema,
  type DecklistSearchResult,
} from "./dtos/decklist-search-response.schema.ts";
export {
  FOLDER_ID_MAX_LENGTH,
  FOLDER_NAME_MAX_LENGTH,
  FOLDER_SYNC_DECK_FOLDERS_LIMIT,
  FOLDER_SYNC_FOLDERS_LIMIT,
  type Folder,
  FolderSchema,
  type FolderSyncRequest,
  FolderSyncRequestSchema,
  type FolderSyncResponse,
  FolderSyncResponseSchema,
  type FolderSyncState,
  FolderSyncStateSchema,
} from "./dtos/folder-sync.schema.ts";
export {
  type CardErrataResponse,
  CardErrataResponseSchema,
  type CardFaqResponse,
  CardFaqResponseSchema,
  type GrimoireResponse,
  GrimoireResponseSchema,
} from "./dtos/grimoire-response.schema.ts";
export {
  type UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from "./dtos/profile.schema.ts";
export {
  RECOMMENDATIONS_REQUIRED_CARDS_LIMIT,
  type RecommendationsRequest,
  RecommendationsRequestSchema,
} from "./dtos/recommendations-request.schema.ts";
export {
  type Recommendation,
  RecommendationSchema,
  type RecommendationsResponse,
  RecommendationsResponseSchema,
} from "./dtos/recommendations-response.schema.ts";
export {
  type SealedDeckResponse,
  SealedDeckResponseSchema,
} from "./dtos/sealed-deck-response.schema.ts";
export {
  REMOTE_SETTINGS_MAX_BYTES,
  type SettingsRequest,
  SettingsRequestSchema,
  type SettingsResponse,
  SettingsResponseSchema,
} from "./dtos/settings.schema.ts";

export {
  canonicalCardName,
  cardLevel,
  countExperience,
  realCardLevel,
} from "./lib/card-utils.ts";

export {
  ASSET_SLOT_ORDER,
  DECKLIST_SEARCH_MAX_XP,
  FACTION_ORDER,
  type FactionName,
  OAUTH_CONNECTIONS,
  type OAuthConnection,
  PLAYER_TYPE_ORDER,
  type PlayerType,
  SKILL_KEYS,
  type SkillIcon,
  type SkillKey,
  SPECIAL_CARD_CODES,
} from "./lib/constants.ts";
export {
  OAUTH_FLOW_ERROR_CODES,
  type OAuthFlowErrorCode,
} from "./lib/oauth-flow-errors.ts";
export {
  decodeSearch,
  encodeSearch,
} from "./lib/search-params.ts";
export {
  type JsonDataFaction,
  JsonDataFactionSchema,
  type JsonDataSubtype,
  JsonDataSubtypeSchema,
  type JsonDataType,
  JsonDataTypeSchema,
  type JsonValue,
  JsonValueSchema,
} from "./schemas/base.schema.ts";
export {
  type Campaign,
  CampaignSchema,
  type JsonDataCampaign,
  JsonDataCampaignSchema,
} from "./schemas/campaign.schema.ts";
export {
  type ApiCard,
  ApiCardSchema,
  type ApiDeckRequirements,
  type ApiRestrictions,
  type Attachments,
  type AttributeFilter,
  type Card,
  CardSchema,
  type CustomizationOption,
  type DeckOption,
  type DeckOptionSelectType,
  type JsonDataCard,
  JsonDataCardSchema,
  type OptionSelect,
} from "./schemas/card.schema.ts";
export {
  type Cycle,
  CycleSchema,
  type JsonDataCycle,
  JsonDataCycleSchema,
} from "./schemas/cycle.schema.ts";
export {
  type DataVersion,
  DataVersionSchema,
} from "./schemas/data-version.schema.ts";
export {
  DECK_DESCRIPTION_MAX_BYTES,
  DECK_EXILE_STRING_MAX_BYTES,
  DECK_ID_MAX_LENGTH,
  DECK_PROBLEM_MAX_LENGTH,
  DECK_TAGS_MAX_BYTES,
  type Deck,
  type DeckFanMadeContent,
  type DeckFanMadeContentSlots,
  type DeckId,
  DeckIdSchema,
  type DeckMeta,
  type DeckProblem,
  DeckProblemSchema,
  DeckSchema,
  type Id,
  isDeck,
  type Slots,
  SlotsSchema,
} from "./schemas/deck.schema.ts";
export {
  type EncounterSet,
  EncounterSetSchema,
  type JsonDataEncounterSet,
  JsonDataEncounterSetSchema,
} from "./schemas/encounter-set.schema.ts";
export {
  type Errata,
  ErrataSchema,
  type JsonDataErrata,
  JsonDataErrataSchema,
} from "./schemas/errata.schema.ts";

export {
  type FanMadeCard,
  FanMadeCardSchema,
  type FanMadeProject,
  FanMadeProjectSchema,
} from "./schemas/fan-made-project.schema.ts";
export {
  type FanMadeProjectInfo,
  FanMadeProjectInfoSchema,
} from "./schemas/fan-made-project-info.schema.ts";
export {
  type Faq,
  FaqSchema,
  type JsonDataFaq,
  JsonDataFaqSchema,
} from "./schemas/faq.schema.ts";
export {
  type GrimoireEntry,
  GrimoireEntrySchema,
  type GrimoireSection,
  GrimoireSectionSchema,
} from "./schemas/grimoire.schema.ts";
export {
  type JsonDataPack,
  JsonDataPackSchema,
  type Pack,
  PackSchema,
} from "./schemas/pack.schema.ts";
export {
  type JsonDataRulesVersion,
  JsonDataRulesVersionSchema,
} from "./schemas/rules-version.schema.ts";
export {
  type JsonDataScenario,
  JsonDataScenarioSchema,
  type Scenario,
  ScenarioSchema,
} from "./schemas/scenario.schema.ts";
export {
  COLLECTION_KEY_LIMIT,
  type Collection,
  CollectionSchema,
  type DecklistConfig,
  DecklistConfigSchema,
  type ListConfig,
  ListConfigSchema,
  type RemoteSettings,
  RemoteSettingsSchema,
  type Settings,
  SettingsSchema,
  STORAGE_PROVIDERS,
  type StorageProvider,
  StorageProviderSchema,
} from "./schemas/settings.schema.ts";
export {
  type Taboo,
  TabooSchema,
} from "./schemas/taboo.schema.ts";
export {
  type JsonDataTabooSet,
  JsonDataTabooSetSchema,
  type TabooSet,
  TabooSetSchema,
} from "./schemas/taboo-set.schema.ts";
