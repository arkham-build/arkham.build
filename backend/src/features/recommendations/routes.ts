import {
  decodeSearch,
  type RecommendationsRequest,
  RecommendationsRequestSchema,
  RecommendationsResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import { publicCache } from "../../lib/cache-headers.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import {
  findCanonicalInvestigatorCode,
  getRecommendationsByAbsolutePercentage,
  getRecommendationsByPercentileRank,
} from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.use("*", publicCache(86400, true));

routes.get("/:canonical_investigator_code", async (c) => {
  const request = decodeSearch<RecommendationsRequest>(
    RecommendationsRequestSchema,
    {
      ...c.req.queries(),
      canonical_investigator_code: [c.req.param("canonical_investigator_code")],
    },
  );

  const recommendations = await getRecommendations(c.get("db"), request);

  const response = RecommendationsResponseSchema.parse({
    data: { recommendations },
  });

  return c.json(response);
});

async function getRecommendations(
  db: Database,
  request: RecommendationsRequest,
) {
  const canonicalInvestigatorCode = await findCanonicalInvestigatorCode(
    db,
    request.canonical_investigator_code,
  );

  if (!canonicalInvestigatorCode) {
    throw new HTTPException(400, {
      cause: new Error(
        `canonical_investigator_code ${request.canonical_investigator_code} does not match an investigator card.`,
      ),
    });
  }

  request.canonical_investigator_code = canonicalInvestigatorCode;

  const { decksAnalyzed, recommendations } =
    await (request.analysis_algorithm === "absolute_rank"
      ? getRecommendationsByAbsolutePercentage(db, request)
      : getRecommendationsByPercentileRank(db, request));

  return {
    decks_analyzed: decksAnalyzed,
    recommendations,
  };
}

export default routes;
