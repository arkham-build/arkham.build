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
  DeckUpgradeRequestSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Selectable } from "kysely";
import type { Database } from "../../db/db.ts";
import type { DB } from "../../db/schema.types.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/session-auth-middleware.ts";
import {
  ACCOUNT_PROVIDER_TYPE,
  deckDtoToRow,
  deckRowToDto,
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
      id: deck.id,
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
    const decks = await getAccountDecksByIds(
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
        id: String(id),
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
    const current = await getAccountDeckById(db, accountId, deckId);

    if (payload.id !== deckId) {
      throw new HTTPException(400, {
        message: "Deck id in request body must match route parameter",
      });
    }

    if (!current) {
      throw new HTTPException(409, {
        message: "Stored deck version does not match the expected version",
        cause: DeckConflictResponseSchema.parse({
          remoteDeck: null,
          remoteVersion: null,
        }),
      });
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
    const current = await getAccountDeckById(db, accountId, c.req.param("id"));

    if (!current) {
      throw new HTTPException(409, {
        message: "Stored deck version does not match the expected version",
        cause: DeckConflictResponseSchema.parse({
          remoteDeck: null,
          remoteVersion: null,
        }),
      });
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
    .orderBy("id")
    .execute();
}

async function getAccountDeckById(db: Database, accountId: string, id: string) {
  const decks = await getAccountDecksByIds(db, accountId, [id]);
  return decks.find((deck) => deck.id === id);
}

async function getAccountDecksByIds(
  db: Database,
  accountId: string,
  ids: string[],
) {
  if (!ids.length) {
    return [];
  }

  return await db
    .selectFrom("deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("id", "in", ids)
    .execute();
}

function getManifestVersion(decks: Selectable<DB["deck"]>[]) {
  const hash = createHash("sha256");

  const items = decks.map((deck) => ({
    id: deck.id,
    updatedAt: deck.updated_at.toISOString(),
    version: deck.version ?? "",
  }));

  for (const item of items) {
    hash.update(`${item.id}:${item.version}:${item.updatedAt}`);
  }

  return hash.digest("hex");
}

routes.post(
  "/upgrade/:id",
  sessionAuth(),
  zodValidator("json", DeckUpgradeRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const previousDeckId = c.req.param("id");
    const { deck, expectedVersion } = c.req.valid("json");

    if (String(deck.id) === previousDeckId) {
      throw new HTTPException(400, {
        message: "Upgraded deck id must differ from previous deck id",
      });
    }

    const created = await db.transaction().execute(async (tx) => {
      const current = await tx
        .selectFrom("deck")
        .selectAll()
        .where("account_id", "=", accountId)
        .where("id", "=", previousDeckId)
        .forUpdate()
        .executeTakeFirst();

      if (!current) {
        throw new HTTPException(409, {
          message: "Stored deck version does not match the expected version",
          cause: DeckConflictResponseSchema.parse({
            remoteDeck: null,
            remoteVersion: null,
          }),
        });
      }

      if (current.version !== expectedVersion) {
        throw new HTTPException(409, {
          message: "Stored deck version does not match the expected version",
          cause: DeckConflictResponseSchema.parse({
            remoteDeck: deckRowToDto(current),
            remoteVersion: current.version ?? null,
          }),
        });
      }

      if (current.next_deck) {
        throw new HTTPException(409, {
          message: "Deck already has an upgrade",
          cause: DeckConflictResponseSchema.parse({
            remoteDeck: deckRowToDto(current),
            remoteVersion: current.version ?? null,
          }),
        });
      }

      const { id, version, ...deckPayload } = deck;

      const createdDeckId = String(id);

      const created = await tx
        .insertInto("deck")
        .values({
          ...deckDtoToRow({
            ...deckPayload,
            next_deck: null,
            previous_deck: current.id,
          }),
          account_id: accountId,
          id: createdDeckId,
          provider_type: ACCOUNT_PROVIDER_TYPE,
          version,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await tx
        .updateTable("deck")
        .set({ next_deck: createdDeckId, updated_at: new Date() })
        .where("id", "=", current.id)
        .executeTakeFirst();

      return created;
    });

    return c.json(DeckSchema.parse(deckRowToDto(created)));
  },
);
