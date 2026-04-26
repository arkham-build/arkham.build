import { createHash } from "node:crypto";
import {
  DeckBatchRequestSchema,
  DeckBatchResponseSchema,
  DeckConflictResponseSchema,
  DeckCreateRequestSchema,
  DeckDeleteRequestSchema,
  DeckManifestResponseSchema,
  DeckSchema,
  DeckUpdateRequestSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type Selectable, sql } from "kysely";
import type { Database } from "../../db/db.ts";
import type { DB } from "../../db/schema.types.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/session-auth-middleware.ts";
import {
  ACCOUNT_PROVIDER_TYPE,
  deckDtoToRow,
  deckRowToDto,
  getExternalDeckId,
} from "./conversion.ts";

const routes = new Hono<HonoEnv>();

routes.get("/manifest", sessionAuth(), async (c) => {
  const decks = await getAccountDecksForManifest(
    c.get("db"),
    c.get("account").id,
  );

  const manifest = DeckManifestResponseSchema.parse({
    version: getManifestVersion(decks),
    decks: decks.map((deck) => ({
      id: getExternalDeckId(deck),
      version: deck.version ?? "",
      updatedAt: deck.updated_at.toISOString(),
    })),
  });

  return c.json(manifest);
});

routes.post(
  "/batch",
  sessionAuth(),
  zodValidator("json", DeckBatchRequestSchema),
  async (c) => {
    const { ids } = c.req.valid("json");
    const decks = await getAccountDecksByExternalIds(
      c.get("db"),
      c.get("account").id,
      ids.map(String),
    );

    return c.json(DeckBatchResponseSchema.parse(decks.map(deckRowToDto)));
  },
);

routes.post(
  "/",
  sessionAuth(),
  zodValidator("json", DeckCreateRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const payload = c.req.valid("json");
    const { id, version, ...deckPayload } = payload;

    const created = await db
      .insertInto("deck")
      .values({
        ...deckDtoToRow(deckPayload),
        account_id: accountId,
        provider_deck_id: String(id),
        provider_type: ACCOUNT_PROVIDER_TYPE,
        version,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return c.json(DeckSchema.parse(deckRowToDto(created)));
  },
);

routes.put(
  "/:id",
  sessionAuth(),
  zodValidator("json", DeckUpdateRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const payload = c.req.valid("json");
    const deckId = c.req.param("id");
    const current = await getAccountDeckByExternalId(db, accountId, deckId);

    if (payload.id !== deckId) {
      throw new HTTPException(400, {
        message: "Deck id in request body must match route parameter",
      });
    }

    if (!current) {
      throw new HTTPException(404, { message: "Deck not found" });
    }

    if ((current.version ?? "") !== payload.expectedVersion) {
      throw new HTTPException(409, {
        message: "Stored deck version does not match the expected version",
        cause: DeckConflictResponseSchema.parse({
          remoteDeck: deckRowToDto(current),
          remoteVersion: current.version ?? null,
        }),
      });
    }

    const { expectedVersion: _, id: __, version, ...deckPayload } = payload;
    const updated = await db
      .updateTable("deck")
      .set({
        ...deckDtoToRow(deckPayload),
        provider_type: current.provider_type,
        updated_at: new Date(),
        version,
      })
      .where("id", "=", current.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return c.json(DeckSchema.parse(deckRowToDto(updated)));
  },
);

routes.delete(
  "/:id",
  sessionAuth(),
  zodValidator("json", DeckDeleteRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const { expectedVersion } = c.req.valid("json");
    const current = await getAccountDeckByExternalId(
      db,
      accountId,
      c.req.param("id"),
    );

    if (!current) {
      throw new HTTPException(404, { message: "Deck not found" });
    }

    if ((current.version ?? "") !== expectedVersion) {
      throw new HTTPException(409, {
        message: "Stored deck version does not match the expected version",
        cause: DeckConflictResponseSchema.parse({
          remoteDeck: deckRowToDto(current),
          remoteVersion: current.version ?? null,
        }),
      });
    }

    await db.deleteFrom("deck").where("id", "=", current.id).executeTakeFirst();
    return new Response(null, { status: 204 });
  },
);

export default routes;

async function getAccountDecksForManifest(db: Database, accountId: string) {
  return await db
    .selectFrom("deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .orderBy(sql<string>`coalesce(provider_deck_id, id::text)`)
    .execute();
}

async function getAccountDeckByExternalId(
  db: Database,
  accountId: string,
  externalId: string,
) {
  const decks = await getAccountDecksByExternalIds(db, accountId, [externalId]);
  return decks.find((deck) => getExternalDeckId(deck) === externalId);
}

async function getAccountDecksByExternalIds(
  db: Database,
  accountId: string,
  externalIds: string[],
) {
  if (!externalIds.length) {
    return [];
  }

  return await db
    .selectFrom("deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where((eb) =>
      eb.or([
        eb("provider_deck_id", "in", externalIds),
        sql<boolean>`id::text in (${sql.join(externalIds)})`,
      ]),
    )
    .execute();
}

function getManifestVersion(decks: Selectable<DB["deck"]>[]) {
  const hash = createHash("sha256");

  const items = decks.map((deck) => ({
    id: getExternalDeckId(deck),
    updatedAt: deck.updated_at.toISOString(),
    version: deck.version ?? "",
  }));

  for (const item of items) {
    hash.update(`${item.id}:${item.version}:${item.updatedAt}`);
  }

  return hash.digest("hex");
}
