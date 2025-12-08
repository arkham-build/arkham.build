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
  decodeSearch,
  encodeSearch,
} from "./lib/search-params.ts";
