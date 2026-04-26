/** biome-ignore-all lint/performance/noBarrelFile: TECH DEBT: look into `exports` */

export {
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  type ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
  type LoginRequest,
  LoginRequestSchema,
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
  type VerifyEmailRequest,
  VerifyEmailRequestSchema,
} from "./dtos/auth.schema.ts";

export {
  type DateRange,
  DateRangeSchema,
} from "./dtos/date-range.schema.ts";

export {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "./dtos/decklist-meta-response.schema.ts";

export {
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
} from "./dtos/decklist-search-request.schema.ts";

export {
  type DecklistSearchResponse,
  DecklistSearchResponseSchema,
  type DecklistSearchResult,
} from "./dtos/decklist-search-response.schema.ts";

export {
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
  type SettingsRequest,
  SettingsRequestSchema,
  type SettingsResponse,
  SettingsResponseSchema,
} from "./dtos/settings.schema.ts";

export { cardLevel, countExperience, realCardLevel } from "./lib/card-utils.ts";

export {
  ASSET_SLOT_ORDER,
  DECKLIST_SEARCH_MAX_XP,
  FACTION_ORDER,
  type FactionName,
  PLAYER_TYPE_ORDER,
  type PlayerType,
  SKILL_KEYS,
  type SkillIcon,
  type SkillKey,
} from "./lib/constants.ts";

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
  type JsonDataCycle,
  JsonDataCycleSchema,
} from "./schemas/cycle.schema.ts";
export {
  type DataVersion,
  DataVersionSchema,
} from "./schemas/data-version.schema.ts";
export {
  type JsonDataEncounterSet,
  JsonDataEncounterSetSchema,
} from "./schemas/encounter-set.schema.ts";
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
  type JsonDataPack,
  JsonDataPackSchema,
} from "./schemas/pack.schema.ts";
export {
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
  type JsonDataTabooSet,
  JsonDataTabooSetSchema,
} from "./schemas/taboo-set.schema.ts";
