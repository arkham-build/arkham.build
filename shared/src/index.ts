/** biome-ignore-all lint/performance/noBarrelFile: TECH DEBT: look into `exports` */

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
  ASSET_SLOT_ORDER,
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
  type FanMadeCard,
  FanMadeCardSchema,
  type FanMadeProject,
  FanMadeProjectSchema,
} from "./schemas/fan-made-project.schema.ts";
export {
  type FanMadeProjectInfo,
  FanMadeProjectInfoSchema,
} from "./schemas/fan-made-project-info.schema.ts";
