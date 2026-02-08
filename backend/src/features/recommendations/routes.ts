import {
  decodeSearch,
  type RecommendationsRequest,
  RecommendationsRequestSchema,
  RecommendationsResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import {
  getRecommendationsByAbsolutePercentage,
  getRecommendationsByPercentileRank,
  resolveCanonicalInvestigator,
} from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/:canonical_investigator_code", async (c) => {
  const req = decodeSearch<RecommendationsRequest>(
    RecommendationsRequestSchema,
    {
      ...c.req.queries(),
      canonical_investigator_code: [c.req.param("canonical_investigator_code")],
    },
  );

  const recommendations = await getRecommendations(c.get("db"), req);

  const res = RecommendationsResponseSchema.parse({
    data: { recommendations },
  });

  c.header("Cache-Control", "public, max-age=86400, immutable");
  return c.json(res);
});

async function getRecommendations(db: Database, req: RecommendationsRequest) {
  const canonicalInvestigatorCode = await resolveCanonicalInvestigator(
    db,
    req.canonical_investigator_code,
  );

  if (!canonicalInvestigatorCode) {
    throw new HTTPException(400, {
      cause: new Error(
        `canonical_investigator_code ${req.canonical_investigator_code} does not match an investigator card.`,
      ),
    });
  }

  req.canonical_investigator_code = canonicalInvestigatorCode;

  const { decksAnalyzed, recommendations } = await (req.analysis_algorithm ===
  "absolute_rank"
    ? getRecommendationsByAbsolutePercentage(db, req)
    : getRecommendationsByPercentileRank(db, req));

  return {
    decks_analyzed: decksAnalyzed,
    recommendations: recommendations,
  };
}

export default routes;
