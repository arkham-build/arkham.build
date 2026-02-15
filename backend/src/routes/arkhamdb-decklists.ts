import {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
  DecklistSearchResponseSchema,
  decodeSearch,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ExpressionBuilder } from "kysely";
import { sql } from "kysely";
import type { Database } from "../db/db.ts";
import type { Card, DB } from "../db/schema.types.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { statusText } from "../lib/http-status.ts";
import {
  canonicalInvestigatorCodeCond,
  deckFilterConds,
  excludedSlotsCond,
  inDateRangeConds,
  requiredSlotsCond,
} from "./arkhamdb-decklists.helpers.ts";

const router = new Hono<HonoEnv>();

router.use("*", async (c, next) => {
  await next();
  if (c.res.status < 300) {
    c.header("Cache-Control", "public, max-age=86400, immutable");
  }
});

router.get("/search", async (c) => {
  const searchReq = decodeSearch<DecklistSearchRequest>(
    DecklistSearchRequestSchema,
    c.req.queries(),
  );

  const res = await search(c.get("db"), searchReq);
  return c.json(res);
});

router.get("/:id/meta", async (c) => {
  const id = c.req.param("id");
  const meta = await getDecklistMeta(c.get("db"), Number(id));

  if (!meta) {
    throw new HTTPException(404, {
      message: statusText(404),
      cause: `Decklist with ID ${id} not found.`,
    });
  }

  return c.json(meta);
});

async function getDecklistMeta(
  db: Database,
  id: number,
): Promise<DecklistMetaResponse | undefined> {
  const res = await db
    .selectFrom("arkhamdb_decklist")
    .innerJoin("arkhamdb_user", "arkhamdb_user.id", "arkhamdb_decklist.user_id")
    .select([
      "date_creation",
      "like_count",
      "user_id",
      "description_word_count",
      "arkhamdb_user.name as user_name",
      "arkhamdb_user.reputation as user_reputation",
    ])
    .where("arkhamdb_decklist.id", "=", id)
    .executeTakeFirst();

  if (!res) {
    return undefined;
  }

  return DecklistMetaResponseSchema.parse(res);
}

async function search(db: Database, search: DecklistSearchRequest) {
  const conditions = (
    eb: ExpressionBuilder<
      DB & {
        investigator: Card;
      },
      "arkhamdb_decklist" | "arkhamdb_user" | "investigator"
    >,
  ) => {
    const conditions = deckFilterConds(
      eb.ref("is_duplicate"),
      eb.ref("is_searchable"),
    );

    if (search.canonical_investigator_code) {
      conditions.push(
        canonicalInvestigatorCodeCond(
          eb.ref("arkhamdb_decklist.canonical_investigator_code"),
          search.canonical_investigator_code,
        ),
      );
    }

    if (search.date_range) {
      conditions.push(
        ...inDateRangeConds(
          eb.ref("arkhamdb_decklist.date_creation"),
          search.date_range,
        ),
      );
    }

    if (search.required) {
      conditions.push(
        requiredSlotsCond({
          slots: eb.ref("arkhamdb_decklist.slots"),
          sideSlots: eb.ref("arkhamdb_decklist.side_slots"),
          analyzeSideDecks: search.analyze_side_decks,
          requiredCards: search.required,
        }),
      );
    }

    if (search.excluded) {
      conditions.push(
        excludedSlotsCond({
          slots: eb.ref("arkhamdb_decklist.slots"),
          sideSlots: eb.ref("arkhamdb_decklist.side_slots"),
          analyzeSideDecks: search.analyze_side_decks,
          requiredCards: search.excluded,
        }),
      );
    }

    if (search.author_name) {
      conditions.push(
        eb(eb.ref("arkhamdb_user.name"), "ilike", `%${search.author_name}%`),
      );
    }

    if (search.name) {
      conditions.push(
        eb(eb.ref("arkhamdb_decklist.name"), "ilike", `%${search.name}%`),
      );
    }

    if (search.investigator_factions) {
      conditions.push(
        eb(
          eb.ref("investigator.faction_code"),
          "in",
          search.investigator_factions,
        ),
      );
    }

    if (search.description_length) {
      conditions.push(
        eb(
          sql`char_length(arkhamdb_decklist.description_md)`,
          ">=",
          search.description_length,
        ),
      );
    }

    return eb.and(conditions);
  };

  const baseQuery = db
    .selectFrom("arkhamdb_decklist")
    .innerJoin("arkhamdb_user", "arkhamdb_user.id", "arkhamdb_decklist.user_id")
    .innerJoin(
      "card as investigator",
      "investigator.id",
      "arkhamdb_decklist.investigator_code",
    )
    .where(conditions);

  const [countResult, data] = await Promise.all([
    baseQuery.select(sql`count(*)`.as("count")).executeTakeFirst(),
    baseQuery
      .crossJoin(
        db
          .selectFrom("arkhamdb_ranking_cache")
          .select(["max_like_count", "max_reputation"])
          .where("arkhamdb_ranking_cache.id", "=", 1)
          .as("arkhamdb_ranking_cache"),
      )
      .selectAll("arkhamdb_decklist")
      .select([
        "arkhamdb_user.name as user_name",
        "arkhamdb_user.reputation as user_reputation",
        "investigator.faction_code as investigator_faction_code",
        sql<number>`
          CASE WHEN arkhamdb_decklist.like_count >= 5 THEN 1 ELSE 0 END +
          (LN(arkhamdb_decklist.like_count + 1) / LN(arkhamdb_ranking_cache.max_like_count + 1)) * 0.6 +
          EXP(-0.006 * GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_DATE - arkhamdb_decklist.date_creation)) / 86400 - 30)) * 0.4
        `.as("ranking_score"),
      ])
      .orderBy(
        (eb) => {
          const { sort_by } = search;

          if (sort_by === "popularity") {
            return sql.ref("ranking_score");
          }
          if (sort_by === "user_reputation") {
            return eb.ref("arkhamdb_user.reputation");
          }
          if (sort_by === "date") {
            return eb.ref("arkhamdb_decklist.date_creation");
          }

          return eb.ref("arkhamdb_decklist.like_count");
        },
        (eb) => (search.sort_dir === "asc" ? eb.asc() : eb.desc()),
      )
      .limit(search.limit)
      .offset(search.offset)
      .execute(),
  ]);

  return DecklistSearchResponseSchema.parse({
    data,
    meta: {
      limit: search.limit,
      offset: search.offset,
      total: countResult?.count || data.length,
    },
  });
}

export default router;
