import {
  decodeSearch,
  type RecommendationsRequest,
  RecommendationsRequestSchema,
  RecommendationsResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { expressionBuilder, sql } from "kysely";
import type { Database } from "../db/db.ts";
import { getCardById } from "../db/queries/card.ts";
import type { DB } from "../db/schema.types.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import {
  canonicalInvestigatorCodeCond,
  deckFilterConds,
  inDateRangeConds,
  requiredSlotsCond,
} from "./arkhamdb-decklists.helpers.ts";

const router = new Hono<HonoEnv>();

router.get("/:canonical_investigator_code", async (c) => {
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

async function getRecommendationsByAbsolutePercentage(
  db: Database,
  req: RecommendationsRequest,
) {
  const {
    analyze_side_decks,
    canonical_investigator_code,
    date_range,
    required_cards,
  } = req;

  const inclusions = await db
    .with("investigator_decks", (db) => {
      const eb = expressionBuilder<DB, "arkhamdb_decklist">();

      const conditions = [
        ...deckFilterConds(eb.ref("is_duplicate"), eb.ref("is_searchable")),
        eb("like_count", ">", 0),
        canonicalInvestigatorCodeCond(
          eb.ref("arkhamdb_decklist.canonical_investigator_code"),
          canonical_investigator_code,
        ),
      ];

      if (date_range) {
        conditions.push(
          ...inDateRangeConds(
            eb.ref("arkhamdb_decklist.date_creation"),
            date_range,
          ),
        );
      }

      if (required_cards) {
        conditions.push(
          requiredSlotsCond({
            slots: eb.ref("arkhamdb_decklist.slots"),
            sideSlots: eb.ref("arkhamdb_decklist.side_slots"),
            analyzeSideDecks: analyze_side_decks,
            requiredCards: required_cards,
          }),
        );
      }

      return db
        .selectFrom("arkhamdb_decklist")
        .select(["id", "slots", "side_slots"])
        .where(eb.and(conditions));
    })
    .with("deck_card_usage", (db) => {
      const stmt = db
        .selectFrom("investigator_decks")
        .select(["id", sql<string>`jsonb_object_keys(slots)`.as("card_code")]);

      if (!analyze_side_decks) return stmt;

      return stmt.union((db) => {
        return db
          .selectFrom("investigator_decks")
          .select([
            "id",
            sql<string>`jsonb_object_keys(side_slots)`.as("card_code"),
          ])
          .where("side_slots", "is not", null);
      });
    })
    .selectFrom("deck_card_usage")
    .select([
      "deck_card_usage.card_code",
      sql<number>`COUNT(DISTINCT deck_card_usage.id)::int`.as(
        "decks_with_card",
      ),
      sql<number>`(SELECT COUNT(*)::int FROM investigator_decks)`.as(
        "decks_analyzed",
      ),
    ])
    .groupBy("deck_card_usage.card_code")
    .execute();

  const recommendations = inclusions.reduce((acc, inc) => {
    acc.push({
      card_code: inc.card_code,
      decks_matched: inc.decks_with_card,
      recommendation:
        Math.round((inc.decks_with_card / inc.decks_analyzed) * 100_00) / 100,
    });

    return acc;
  }, [] as unknown[]);

  return formatRecommendations(inclusions[0]?.decks_analyzed, recommendations);
}

async function getRecommendationsByPercentileRank(
  db: Database,
  req: RecommendationsRequest,
) {
  const { analyze_side_decks, canonical_investigator_code, required_cards } =
    req;

  const inclusions = await db
    .with("deck_scope", (db) =>
      db
        .selectFrom("arkhamdb_decklist")
        .select(["id", "slots", "side_slots", "canonical_investigator_code"])
        .where((eb) =>
          eb.and([
            ...deckFilterConds(eb.ref("is_duplicate"), eb.ref("is_searchable")),
            eb("like_count", ">", 0),
            requiredSlotsCond({
              analyzeSideDecks: analyze_side_decks,
              slots: eb.ref("slots"),
              sideSlots: eb.ref("side_slots"),
              requiredCards: required_cards,
            }),
          ]),
        ),
    )
    .with("by_investigator", (db) =>
      db
        .selectFrom("deck_scope")
        .select([
          "canonical_investigator_code",
          sql<number>`COUNT(*)::numeric`.as("total_decks"),
          sql<number>`SUM(COUNT(*)) OVER()`.as("decks_analyzed"),
        ])
        .groupBy("canonical_investigator_code"),
    )
    .with("by_card_used", (db) => {
      return db
        .selectFrom("deck_scope")
        .crossJoinLateral(
          sql<{ card_code: string }>`
          (
            SELECT
              unnest(
                array(
                  SELECT
                    jsonb_object_keys(slots)
                ) || CASE
                  WHEN ${analyze_side_decks} AND side_slots IS NOT NULL THEN array(
                    SELECT
                      jsonb_object_keys(side_slots)
                  )
                  ELSE ARRAY[]::TEXT[]
                END
              ) AS card_code
          )
          `.as("cards"),
        )
        .select([
          "cards.card_code",
          "canonical_investigator_code",
          sql<number>`COUNT(*)::numeric`.as("deck_count"),
        ])
        .groupBy(["canonical_investigator_code", "cards.card_code"]);
    })
    .with("percentiles", (db) =>
      db
        .selectFrom("by_card_used")
        .innerJoin(
          "by_investigator",
          "by_card_used.canonical_investigator_code",
          "by_investigator.canonical_investigator_code",
        )
        .select([
          "by_card_used.card_code",
          "by_card_used.canonical_investigator_code",
          sql<number>`by_investigator.total_decks::int`.as("total_decks"),
          sql<number>`by_investigator.decks_analyzed::int`.as("decks_analyzed"),
          sql<number>`ROUND((by_card_used.deck_count / by_investigator.total_decks) * 100, 2)::float`.as(
            "usage_percentage",
          ),
          sql<number>`ROUND(
            PERCENT_RANK() OVER (
              PARTITION BY by_card_used.card_code
              ORDER BY (by_card_used.deck_count / by_investigator.total_decks)
            )::NUMERIC * 100, 2
          )::float`.as("percentile_rank"),
        ])
        .where(
          sql`(by_card_used.deck_count / by_investigator.total_decks)`,
          ">",
          "0.0075",
        ),
    )
    .selectFrom("percentiles")
    .selectAll()
    .where("canonical_investigator_code", "=", canonical_investigator_code)
    .execute();

  const recommendations = inclusions.map((inc) => ({
    card_code: inc.card_code,
    recommendation: inc.percentile_rank,
  }));

  return formatRecommendations(inclusions[0]?.decks_analyzed, recommendations);
}

async function resolveCanonicalInvestigator(db: Database, code: string) {
  const [frontCode, backCode] = code.split("-");

  if (!frontCode || !backCode) {
    return null;
  }

  const [front, back] = await Promise.all([
    getCardById(db, frontCode),
    getCardById(db, backCode),
  ]);

  if (
    front?.type_code !== "investigator" ||
    back.type_code !== "investigator"
  ) {
    return null;
  }

  return `${front.code}-${back.code}`;
}

function formatRecommendations(
  decksAnalyzed: number | undefined,
  recommendations: unknown[],
) {
  const empty = !recommendations.length || !decksAnalyzed;

  return empty
    ? { decksAnalyzed: 0, recommendations: [] }
    : { decksAnalyzed, recommendations };
}

export default router;
