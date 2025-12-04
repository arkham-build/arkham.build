import type { Context } from "hono";
import type { ExpressionBuilder } from "kysely";
import { sql } from "kysely";
import z from "zod";
import type { Database } from "../../db/db.ts";
import type { Card, DB } from "../../db/schema.types.ts";
import { arkhamdbDecklistSchema } from "../../db/schemas/arkhamdb-decklist.schema.ts";
import {
  canonicalInvestigatorCodeCond,
  dateRangeSchema,
  deckFilterConds,
  excludedSlotsCond,
  inDateRangeConds,
  rangeFromQuery,
  requiredSlotsCond,
} from "../../lib/decklists-helpers.ts";

export const searchRequestSchema = z.object({
  analyze_side_decks: z.boolean().optional().default(true),
  author_name: z.string().max(255).optional(),
  canonical_investigator_code: z.string().optional(),
  description_length: z.coerce.number().int().min(0).max(1000).optional(),
  date_range: dateRangeSchema,
  excluded_cards: z.array(z.string()).optional(),
  investigator_factions: z.array(z.string()).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  name: z.string().max(255).optional(),
  offset: z.coerce.number().int().min(0).optional().default(0),
  required_cards: z.array(z.string()).optional(),
  sort_by: z
    .enum(["user_reputation", "date", "likes", "popularity"])
    .default("popularity"),
  sort_dir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export function searchRequestFromQuery(c: Context) {
  return searchRequestSchema.safeParse({
    analyze_side_decks: c.req.query("side_decks") !== "false",
    author_name: c.req.query("author"),
    canonical_investigator_code: c.req.query("investigator"),
    description_length: c.req.query("description_length"),
    date_range: rangeFromQuery("date", c),
    excluded_cards: c.req.queries("without"),
    investigator_factions: c.req.queries("faction"),
    name: c.req.query("name"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
    required_cards: c.req.queries("with"),
    sort_by: c.req.query("sort_by"),
    sort_dir: c.req.query("sort_dir"),
  });
}

export const searchResponseSchema = z.object({
  meta: z.object({
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0),
    total: z.coerce.number().int().min(0),
  }),
  data: z.array(
    arkhamdbDecklistSchema
      .omit({
        description_md: true,
        // TECH DEBT: legacy field names
        side_slots: true,
        ignore_deck_limit_slots: true,
      })
      .extend({
        // TECH DEBT: legacy field names
        ignoreDeckLimitSlots: z.record(z.string(), z.number()).nullable(),
        sideSlots: z.record(z.string(), z.number()).nullable(),
        user_name: z.string(),
        user_reputation: z.coerce.number().int().min(0),
      }),
  ),
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

export async function search(db: Database, search: SearchRequest) {
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

    if (search.required_cards) {
      conditions.push(
        requiredSlotsCond({
          slots: eb.ref("arkhamdb_decklist.slots"),
          sideSlots: eb.ref("arkhamdb_decklist.side_slots"),
          analyzeSideDecks: search.analyze_side_decks,
          requiredCards: search.required_cards,
        }),
      );
    }

    if (search.excluded_cards) {
      conditions.push(
        excludedSlotsCond({
          slots: eb.ref("arkhamdb_decklist.slots"),
          sideSlots: eb.ref("arkhamdb_decklist.side_slots"),
          analyzeSideDecks: search.analyze_side_decks,
          requiredCards: search.excluded_cards,
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
          (LN(arkhamdb_decklist.like_count + 1) / LN(arkhamdb_ranking_cache.max_like_count + 1)) * 0.6 +
          EXP(-0.01 * EXTRACT(EPOCH FROM (CURRENT_DATE - arkhamdb_decklist.date_creation)) / 86400) * 0.2 +
          (LN(arkhamdb_user.reputation + 1) / LN(arkhamdb_ranking_cache.max_reputation + 1)) * 0.2
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

  return {
    // TECH DEBT: legacy field names
    data: data.map(
      ({
        side_slots: sideSlots,
        ignore_deck_limit_slots: ignoreDeckLimitSlots,
        ...deck
      }) => ({
        ...deck,
        sideSlots,
        ignoreDeckLimitSlots,
      }),
    ),
    meta: {
      limit: search.limit,
      offset: search.offset,
      total: countResult?.count || data.length,
    },
  };
}
