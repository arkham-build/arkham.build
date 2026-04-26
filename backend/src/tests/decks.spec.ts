import {
  type Deck,
  DeckBatchResponseSchema,
  DeckConflictResponseSchema,
  DeckManifestResponseSchema,
  DeckSchema,
} from "@arkham-build/shared";
import type { Hono } from "hono";
import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

function getManifest(app: Hono<HonoEnv>, cookie?: string) {
  const headers: Record<string, string> = {};

  if (cookie) {
    headers["Cookie"] = cookie;
  }

  return app.request("/v2/decks/manifest", {
    method: "GET",
    ...(Object.keys(headers).length ? { headers } : {}),
  });
}

function postBatch(app: Hono<HonoEnv>, cookie: string, ids: string[]) {
  return app.request("/v2/decks/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ ids }),
  });
}

function createDeck(
  app: Hono<HonoEnv>,
  cookie: string,
  payload = baseDeckPayload(),
) {
  return app.request("/v2/decks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

function updateDeck(
  app: Hono<HonoEnv>,
  cookie: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return app.request(`/v2/decks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

function deleteDeck(
  app: Hono<HonoEnv>,
  cookie: string,
  id: string,
  expectedVersion: string,
) {
  return app.request(`/v2/decks/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ expectedVersion }),
  });
}

async function readDeck(res: Response): Promise<Deck> {
  return DeckSchema.parse(await res.json());
}

describe("Deck routes", () => {
  describe("GET /v2/decks/manifest", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await getManifest(app);
      expect(res.status).toBe(401);
    });

    test("returns manifest", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "Manifest deck",
        provider_deck_id: "deck-manifest",
        version: "0.1",
      });

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: "deck-manifest",
          version: "0.1",
        }),
      ]);

      expect(manifest.version).toEqual(expect.any(String));
    });
  });

  describe("POST /v2/decks/batch", () => {
    test("returns requested decks", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "First",
        provider_deck_id: "deck-1",
        version: "11111111",
      });
      await insertTestDeck(db, {
        name: "Second",
        provider_deck_id: "deck-2",
        version: "22222222",
      });

      const res = await postBatch(app, sessionCookie, ["deck-2", "deck-1"]);
      expect(res.status).toBe(200);

      const body = DeckBatchResponseSchema.parse(await res.json());
      expect(body).toHaveLength(2);
      expect(new Set(body.map((deck) => deck.id))).toEqual(
        new Set(["deck-1", "deck-2"]),
      );
    });
  });

  describe("POST /v2/decks", () => {
    test("creates a deck", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;
      const res = await createDeck(
        app,
        sessionCookie,
        baseDeckPayload({ id: "client-deck-create", version: "vcrt0001" }),
      );

      expect(res.status).toBe(200);

      const body = await readDeck(res);
      expect(body).toMatchObject({
        id: "client-deck-create",
        name: "Test deck",
        investigator_code: "01001",
        version: "vcrt0001",
      });
    });
  });

  describe("PUT /v2/decks/:id", () => {
    test("updates a deck when version matches", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      const seeded = await insertTestDeck(db, {
        name: "Original",
        provider_deck_id: "deck-update",
        version: "aaaa1111",
      });

      const res = await updateDeck(app, sessionCookie, "deck-update", {
        ...baseDeckPayload({
          id: "deck-update",
          name: "Updated",
          version: "aaaa1112",
        }),
        expectedVersion: seeded.version,
      });

      expect(res.status).toBe(200);

      const body = await readDeck(res);
      expect(body.name).toBe("Updated");
      expect(body.version).toBe("aaaa1112");
    });

    test("returns 409 on version conflict", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "Conflict",
        provider_deck_id: "deck-conflict",
        version: "bbbb2222",
      });

      const res = await updateDeck(app, sessionCookie, "deck-conflict", {
        ...baseDeckPayload({
          id: "deck-conflict",
          name: "Updated",
          version: "bbbb2223",
        }),
        expectedVersion: "stale000",
      });

      expect(res.status).toBe(409);

      const body = (await res.json()) as { cause: unknown };
      const conflict = DeckConflictResponseSchema.parse(body.cause);
      expect(conflict.remoteVersion).toBe("bbbb2222");
      expect(conflict.remoteDeck?.id).toBe("deck-conflict");
    });
  });

  describe("DELETE /v2/decks/:id", () => {
    test("deletes a deck when version matches", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        provider_deck_id: "deck-delete",
        version: "cccc3333",
      });

      const res = await deleteDeck(
        app,
        sessionCookie,
        "deck-delete",
        "cccc3333",
      );
      expect(res.status).toBe(204);

      const manifestRes = await getManifest(app, sessionCookie);
      const manifest = DeckManifestResponseSchema.parse(
        await manifestRes.json(),
      );
      expect(manifest.decks).toEqual([]);
    });

    test("returns 409 on delete version conflict", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        provider_deck_id: "deck-delete-conflict",
        version: "dddd4444",
      });

      const res = await deleteDeck(
        app,
        sessionCookie,
        "deck-delete-conflict",
        "stale000",
      );
      expect(res.status).toBe(409);
    });
  });
});

function baseDeckPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    description_md: "",
    exile_string: null,
    id: "client-deck",
    ignoreDeckLimitSlots: null,
    investigator_code: "01001",
    investigator_name: "Roland Banks",
    meta: "{}",
    name: "Test deck",
    next_deck: null,
    previous_deck: null,
    problem: null,
    sideSlots: null,
    slots: { "01006": 1, "01007": 1 },
    taboo_id: null,
    tags: "",
    version: "vtest001",
    xp_adjustment: null,
    xp_spent: 0,
    xp: 0,
    ...overrides,
  };
}

async function insertTestDeck(
  db: Database,
  overrides: Partial<{
    name: string;
    provider_deck_id: string;
    version: string;
  }> = {},
) {
  const account = await db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();

  return await db
    .insertInto("deck")
    .values({
      account_id: account.id,
      description: "",
      investigator_code: "01001",
      investigator_name: "Roland Banks",
      meta: {},
      name: overrides.name ?? "Seeded deck",
      provider_deck_id: overrides.provider_deck_id ?? "deck-seeded",
      provider_type: "account",
      slots: { "01006": 1 },
      tags: null,
      version: overrides.version ?? "seed0001",
      xp: 0,
      xp_adjustment: 0,
      xp_spent: 0,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
