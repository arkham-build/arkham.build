import {
  DeckBatchResponseSchema,
  DeckConflictResponseSchema,
  DeckManifestResponseSchema,
  DeckSchema,
  type DeckSyncTarget,
} from "@arkham-build/shared";
import type { Hono } from "hono";
import { describe, expect, vi } from "vitest";
import type { Database } from "../db/db.ts";
import { ArkhamDbRemoteDecksSchema } from "../lib/arkhamdb/api-client/core/dtos.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

function getManifest(
  app: Hono<HonoEnv>,
  cookie?: string,
  opts: { forceArkhamdbSync?: boolean } = {},
) {
  const headers: Record<string, string> = {};
  const path = opts.forceArkhamdbSync
    ? "/v2/account/decks/manifest?forceArkhamdbSync=true"
    : "/v2/account/decks/manifest";

  if (cookie) {
    headers["Cookie"] = cookie;
  }

  return app.request(path, {
    method: "GET",
    ...(Object.keys(headers).length ? { headers } : {}),
  });
}

function getSession(app: Hono<HonoEnv>, cookie: string) {
  return app.request("/v2/account/auth/me", {
    method: "GET",
    headers: {
      Cookie: cookie,
    },
  });
}

function postBatch(
  app: Hono<HonoEnv>,
  cookie: string,
  targets: DeckSyncTarget[],
  arkhamdbSyncToken?: string,
) {
  return app.request("/v2/account/decks/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ arkhamdbSyncToken, targets }),
  });
}

function uploadDeckBatch(
  app: Hono<HonoEnv>,
  cookie: string,
  payload: { decks: unknown[] },
) {
  return app.request("/v2/account/decks/upload/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

function createDeck(
  app: Hono<HonoEnv>,
  cookie: string,
  payload = baseDeckPayload(),
) {
  return app.request("/v2/account/decks", {
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
  return app.request(`/v2/account/decks/${id}`, {
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
  provider = "account",
  all?: boolean,
) {
  return app.request(`/v2/account/decks/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ all, expectedVersion, provider }),
  });
}

function upgradeDeck(
  app: Hono<HonoEnv>,
  cookie: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return app.request(`/v2/account/decks/upgrade/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ provider: "account", ...payload }),
  });
}

describe("Deck routes", () => {
  describe("GET /v2/account/decks/manifest", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await getManifest(app);
      expect(res.status).toBe(401);
    });

    test("returns manifest", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "Manifest deck",
        id: "deck-manifest",
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

    test("marks arkhamdb unhealthy when the oauth token is missing", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const account = await db
        .selectFrom("account")
        .select("id")
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      DeckManifestResponseSchema.parse(await res.json());

      const sessionRes = await getSession(app, sessionCookie);
      expect(sessionRes.status).toBe(200);
      expect(await sessionRes.json()).toMatchObject({
        identities: expect.arrayContaining([
          expect.objectContaining({
            provider: "arkhamdb",
            providerUserId: "12345",
            details: {
              status: "unhealthy",
              lastSyncedAt: null,
              lastError:
                "Missing ArkhamDB identity or OAuth token for account.",
              username: null,
            },
          }),
        ]),
      });
    });

    test("syncs arkhamdb decks before returning the manifest", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertArkhamDbConnection(db);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify([
              {
                date_creation: "2026-06-04T12:00:00.000Z",
                date_update: "2026-06-04T13:00:00.000Z",
                id: 123,
                investigator_code: "01001",
                investigator_name: "Roland Banks",
                meta: "{}",
                name: "Arkham Synced Deck",
                problem: "too_few_cards",
                slots: { "01006": 1 },
                version: "1.2",
                xp_spent: 0,
              },
            ]),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Last-Modified": "Thu, 04 Jun 2026 12:00:00 GMT",
              },
            },
          ),
        ),
      );

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: 123,
          version: "1.2",
        }),
      ]);

      const sessionRes = await getSession(app, sessionCookie);
      expect(sessionRes.status).toBe(200);
      expect(await sessionRes.json()).toMatchObject({
        identities: expect.arrayContaining([
          expect.objectContaining({
            provider: "arkhamdb",
            providerUserId: "12345",
            details: {
              status: "healthy",
              lastError: null,
              lastSyncedAt: expect.any(String),
              username: null,
            },
          }),
        ]),
      });
    });

    test("creates a new arkhamdb snapshot when syncing changes", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);
      const lastModified = "Thu, 04 Jun 2026 12:00:00 GMT";

      const oldestSnapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          created_at: new Date(Date.now() - 27 * 60 * 60 * 1000),
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 111,
              name: "Oldest Arkham Deck",
              version: "1.0",
            }),
          ]),
          last_modified: "Tue, 02 Jun 2026 12:00:00 GMT",
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const middleSnapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          created_at: new Date(Date.now() - 26 * 60 * 60 * 1000),
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 222,
              name: "Middle Arkham Deck",
              version: "1.0",
            }),
          ]),
          last_modified: "Wed, 03 Jun 2026 12:00:00 GMT",
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const snapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 123,
              name: "Stale Arkham Deck",
              version: "1.0",
            }),
          ]),
          last_modified: lastModified,
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
        const url = input instanceof Request ? input.url : input.toString();
        expect(url).toBe("https://arkhamdb.com/api/oauth2/decks");
        expect(new Headers(init?.headers).get("If-Modified-Since")).toBe(
          lastModified,
        );
        return Promise.resolve(
          jsonResponse(
            [
              buildArkhamDbApiDeck({
                id: 123,
                name: "Fresh Arkham Deck",
                version: "1.1",
              }),
            ],
            { "Last-Modified": "Fri, 05 Jun 2026 12:00:00 GMT" },
          ),
        );
      });
      vi.stubGlobal("fetch", fetch);

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.arkhamdbSyncToken).not.toBe(snapshot.id);
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: 123,
          version: "1.1",
        }),
      ]);
      await expect(countArkhamDbSnapshots(db, identity.id)).resolves.toBe(3);
      await expect(findArkhamDbSnapshotDecks(db, identity.id)).resolves.toEqual(
        [
          expect.objectContaining({
            id: 123,
            name: "Fresh Arkham Deck",
            version: "1.1",
          }),
        ],
      );

      const snapshotIds = await db
        .selectFrom("arkhamdb_deck_snapshot")
        .select("id")
        .where("account_identity_id", "=", identity.id)
        .execute();
      expect(snapshotIds.map((item) => item.id)).toEqual(
        expect.arrayContaining([
          middleSnapshot.id,
          snapshot.id,
          manifest.arkhamdbSyncToken,
        ]),
      );
      expect(snapshotIds.map((item) => item.id)).not.toContain(
        oldestSnapshot.id,
      );
    });

    test("refreshes an expired arkhamdb token and persists the new token", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertArkhamDbConnection(db);

      let deckRequestCount = 0;

      const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
        const url = input instanceof Request ? input.url : input.toString();

        if (url.endsWith("/api/oauth2/decks")) {
          deckRequestCount += 1;
          const authorization = new Headers(init?.headers).get("Authorization");

          if (deckRequestCount === 1) {
            expect(authorization).toBe("Bearer access-token");
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  error: "invalid_token",
                  error_description: "expired",
                }),
                {
                  status: 401,
                  headers: { "Content-Type": "application/json" },
                },
              ),
            );
          }

          expect(authorization).toBe("Bearer refreshed-access-token");

          return Promise.resolve(
            new Response(
              JSON.stringify([
                buildArkhamDbApiDeck({
                  id: 123,
                  name: "Refreshed token deck",
                  version: "1.3",
                }),
              ]),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Last-Modified": "Thu, 04 Jun 2026 12:00:00 GMT",
                },
              },
            ),
          );
        }

        if (url.endsWith("/oauth/v2/token")) {
          return Promise.resolve(
            jsonResponse({
              access_token: "refreshed-access-token",
              expires_in: 3600,
              refresh_token: "refreshed-refresh-token",
              scope: null,
              token_type: "Bearer",
            }),
          );
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetch);

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: 123,
          version: "1.3",
        }),
      ]);
      expect(fetch).toHaveBeenCalledTimes(3);

      const token = await db
        .selectFrom("account_identity")
        .innerJoin(
          "oauth_token",
          "oauth_token.account_identity_id",
          "account_identity.id",
        )
        .select(["oauth_token.access_token", "oauth_token.refresh_token"])
        .where("account_identity.provider", "=", "arkhamdb")
        .executeTakeFirstOrThrow();

      expect(token).toEqual({
        access_token: "refreshed-access-token",
        refresh_token: "refreshed-refresh-token",
      });
    });

    test("uses the latest arkhamdb snapshot when the manifest is unchanged", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);
      const lastModified = "Thu, 04 Jun 2026 12:00:00 GMT";

      const snapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 321,
              name: "Cached Arkham Deck",
              version: "2.0",
            }),
          ]),
          last_modified: lastModified,
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .updateTable("arkhamdb_deck_snapshot")
        .set({ created_at: new Date("2026-06-04T12:00:00.000Z") })
        .where("id", "=", snapshot.id)
        .executeTakeFirstOrThrow();

      const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
        const url = input instanceof Request ? input.url : input.toString();
        expect(url).toBe("https://arkhamdb.com/api/oauth2/decks");
        expect(new Headers(init?.headers).get("If-Modified-Since")).toBe(
          lastModified,
        );
        return Promise.resolve(new Response(null, { status: 304 }));
      });
      vi.stubGlobal("fetch", fetch);

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.arkhamdbSyncToken).toBe(snapshot.id);
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: 321,
          version: "2.0",
        }),
      ]);
      expect(fetch).toHaveBeenCalledOnce();

      fetch.mockClear();

      const secondRes = await getManifest(app, sessionCookie);
      expect(secondRes.status).toBe(200);
      expect(fetch).not.toHaveBeenCalled();
    });

    test("reuses a 23-hour-old arkhamdb snapshot without checking arkhamdb", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);

      const snapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          created_at: new Date(Date.now() - 23 * 60 * 60 * 1000),
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 654,
              name: "Fresh Arkham Deck",
              version: "1.0",
            }),
          ]),
          last_modified: "Thu, 04 Jun 2026 12:00:00 GMT",
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const fetch = vi.fn<typeof globalThis.fetch>();
      vi.stubGlobal("fetch", fetch);

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.arkhamdbSyncToken).toBe(snapshot.id);
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: 654,
          version: "1.0",
        }),
      ]);
      expect(fetch).not.toHaveBeenCalled();
    });

    test("checks arkhamdb when sync is forced", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);
      const lastModified = "Thu, 04 Jun 2026 12:00:00 GMT";

      const snapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          created_at: new Date(),
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 654,
              name: "Fresh Arkham Deck",
              version: "1.0",
            }),
          ]),
          last_modified: lastModified,
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
        const url = input instanceof Request ? input.url : input.toString();
        expect(url).toBe("https://arkhamdb.com/api/oauth2/decks");
        expect(new Headers(init?.headers).get("If-Modified-Since")).toBe(
          lastModified,
        );
        return Promise.resolve(new Response(null, { status: 304 }));
      });
      vi.stubGlobal("fetch", fetch);

      const res = await getManifest(app, sessionCookie, {
        forceArkhamdbSync: true,
      });
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.arkhamdbSyncToken).toBe(snapshot.id);
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: 654,
          version: "1.0",
        }),
      ]);
      expect(fetch).toHaveBeenCalledOnce();
    });

    test("keeps account decks available when arkhamdb sync fails", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "Local deck",
        id: "local-deck",
        version: "0.1",
      });

      await insertArkhamDbConnection(db);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ code: 500, message: "boom" }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }),
        ),
      );

      const res = await getManifest(app, sessionCookie);
      expect(res.status).toBe(200);

      const manifest = DeckManifestResponseSchema.parse(await res.json());
      expect(manifest.decks).toEqual([
        expect.objectContaining({
          id: "local-deck",
          version: "0.1",
        }),
      ]);

      const sessionRes = await getSession(app, sessionCookie);
      expect(sessionRes.status).toBe(200);
      expect(await sessionRes.json()).toMatchObject({
        identities: expect.arrayContaining([
          expect.objectContaining({
            provider: "arkhamdb",
            providerUserId: "12345",
            details: {
              status: "unhealthy",
              lastSyncedAt: null,
              lastError: "boom",
              username: null,
            },
          }),
        ]),
      });
    });
  });

  describe("POST /v2/account/decks/batch", () => {
    test("returns requested decks", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "First",
        id: "deck-1",
        version: "11111111",
      });
      await insertTestDeck(db, {
        name: "Second",
        id: "deck-2",
        version: "22222222",
      });

      const res = await postBatch(app, sessionCookie, [
        { provider: "account", id: "deck-2" },
        { provider: "account", id: "deck-1" },
      ]);
      expect(res.status).toBe(200);

      const body = DeckBatchResponseSchema.parse(await res.json());
      expect(body).toHaveLength(2);
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "deck-1" }),
          expect.objectContaining({ id: "deck-2" }),
        ]),
      );
    });

    test("returns arkhamdb decks from a stored snapshot", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const account = await db
        .selectFrom("account")
        .select("id")
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      const identity = await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
          verified_at: new Date(),
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const snapshot = await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 123,
              meta: "{alternate_back:90024}",
              name: "Snapshot deck",
              version: "1.1",
            }),
          ]),
          last_modified: "Thu, 04 Jun 2026 12:00:00 GMT",
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      vi.stubGlobal(
        "fetch",
        vi.fn(() => {
          throw new Error("ArkhamDB should not be fetched for snapshot batch");
        }),
      );

      const res = await postBatch(
        app,
        sessionCookie,
        [{ provider: "arkhamdb", id: "123" }],
        snapshot.id,
      );
      expect(res.status).toBe(200);

      const body = DeckBatchResponseSchema.parse(await res.json());
      expect(body).toMatchObject([
        {
          id: 123,
          meta: "{}",
          name: "Snapshot deck",
          source: "arkhamdb",
          version: "1.1",
        },
      ]);
    });

    test("fetches arkhamdb decks directly without a snapshot token", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertArkhamDbConnection(db);

      const fetch = vi.fn().mockResolvedValue(
        jsonResponse(
          buildArkhamDbApiDeck({
            id: 123,
            name: "Live deck",
            version: "1.2",
          }),
        ),
      );
      vi.stubGlobal("fetch", fetch);

      const res = await postBatch(app, sessionCookie, [
        { provider: "arkhamdb", id: "123" },
      ]);
      expect(res.status).toBe(200);

      const body = DeckBatchResponseSchema.parse(await res.json());
      expect(body).toMatchObject([
        {
          id: 123,
          name: "Live deck",
          source: "arkhamdb",
          version: "1.2",
        },
      ]);
      expect(fetch).toHaveBeenCalledOnce();
    });
  });

  describe("POST /v2/account/decks/upload/batch", () => {
    test("uploads a deck chain", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;

      const res = await uploadDeckBatch(app, sessionCookie, {
        decks: [
          baseDeckPayload({
            id: "batch-root",
            next_deck: "batch-upgrade",
            source: "account",
            taboo_id: 8,
          }),
          baseDeckPayload({
            id: "batch-upgrade",
            previous_deck: "batch-root",
            source: "account",
            version: "00000002",
            taboo_id: 9,
          }),
        ],
      });

      expect(res.status).toBe(200);

      const body = DeckBatchResponseSchema.parse(await res.json());
      expect(body).toMatchObject([
        { id: "batch-root", next_deck: "batch-upgrade", taboo_id: 8 },
        { id: "batch-upgrade", previous_deck: "batch-root", taboo_id: 9 },
      ]);

      const rows = await db
        .selectFrom("deck")
        .select(["id", "next_deck", "prev_deck", "taboo_set_id"])
        .where("id", "in", ["batch-root", "batch-upgrade"])
        .orderBy("id")
        .execute();

      expect(rows).toEqual([
        {
          id: "batch-root",
          next_deck: "batch-upgrade",
          prev_deck: null,
          taboo_set_id: 8,
        },
        {
          id: "batch-upgrade",
          next_deck: null,
          prev_deck: "batch-root",
          taboo_set_id: 9,
        },
      ]);
    });

    test("rejects missing deck chain references", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await uploadDeckBatch(app, sessionCookie, {
        decks: [
          baseDeckPayload({
            id: "batch-root",
            next_deck: "missing-upgrade",
            source: "account",
          }),
        ],
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain(
        "Uploaded deck chains must include all referenced decks",
      );
    });
  });

  describe("POST /v2/account/decks", () => {
    test("creates a deck", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;
      const res = await createDeck(
        app,
        sessionCookie,
        baseDeckPayload({ id: "client-deck-create", version: "vcrt0001" }),
      );

      expect(res.status).toBe(200);

      const body = DeckSchema.parse(await res.json());
      expect(body).toMatchObject({
        id: "client-deck-create",
        name: "Test deck",
        investigator_code: "01001",
        version: "vcrt0001",
      });
    });

    test("rejects uploading an upgraded account deck", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;
      const res = await createDeck(
        app,
        sessionCookie,
        baseDeckPayload({
          id: "client-deck-create",
          previous_deck: "previous-deck",
          source: "account",
        }),
      );

      expect(res.status).toBe(400);
    });

    test("rejects uploading an upgraded ArkhamDB deck", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertArkhamDbConnection(db);
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);

      const res = await createDeck(
        app,
        sessionCookie,
        baseDeckPayload({
          id: "client-deck-create",
          previous_deck: "previous-deck",
          source: "arkhamdb",
        }),
      );

      expect(res.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("PUT /v2/account/decks/:id", () => {
    test("updates a deck when version matches", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      const seeded = await insertTestDeck(db, {
        name: "Original",
        id: "deck-update",
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

      const body = DeckSchema.parse(await res.json());
      expect(body.name).toBe("Updated");
      expect(body.version).toBe("aaaa1112");
    });

    test("returns 409 on version conflict", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        name: "Conflict",
        id: "deck-conflict",
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

    test("returns a conflict when the deck was already removed", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await updateDeck(app, sessionCookie, "deck-missing", {
        ...baseDeckPayload({
          id: "deck-missing",
          name: "Updated",
          version: "bbbb2223",
        }),
        expectedVersion: "stale000",
      });

      expect(res.status).toBe(409);

      const body = (await res.json()) as { cause: unknown };
      const conflict = DeckConflictResponseSchema.parse(body.cause);
      expect(conflict.remoteVersion).toBeNull();
      expect(conflict.remoteDeck).toBeNull();
    });
  });

  describe("POST /v2/account/decks/upgrade/:id", () => {
    test("creates an upgraded deck and links it to the previous deck", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        id: "deck-upgrade-base",
        version: "base0001",
      });

      const res = await upgradeDeck(app, sessionCookie, "deck-upgrade-base", {
        deck: baseDeckPayload({
          id: "deck-upgrade-created",
          name: "Upgraded",
          version: "upg00001",
        }),
        expectedVersion: "base0001",
      });

      expect(res.status).toBe(200);

      const body = DeckSchema.parse(await res.json());
      expect(body).toMatchObject({
        id: "deck-upgrade-created",
        name: "Upgraded",
        next_deck: null,
        previous_deck: "deck-upgrade-base",
        version: "upg00001",
      });

      const previous = await db
        .selectFrom("deck")
        .select(["next_deck"])
        .where("id", "=", "deck-upgrade-base")
        .executeTakeFirstOrThrow();

      expect(previous.next_deck).toBe("deck-upgrade-created");
    });

    test("returns 409 when the previous deck already has an upgrade", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const previous = await insertTestDeck(db, {
        id: "deck-already-upgraded",
        version: "base0001",
      });
      await insertTestDeck(db, {
        id: "existing-upgrade",
        version: "upg00001",
      });
      await db
        .updateTable("deck")
        .set({ next_deck: "existing-upgrade" })
        .where("id", "=", previous.id)
        .executeTakeFirst();

      const res = await upgradeDeck(
        app,
        sessionCookie,
        "deck-already-upgraded",
        {
          deck: baseDeckPayload({ id: "deck-new-upgrade" }),
          expectedVersion: "base0001",
        },
      );

      expect(res.status).toBe(409);
    });

    test("returns a conflict when the previous deck was already removed", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await upgradeDeck(app, sessionCookie, "deck-missing", {
        deck: baseDeckPayload({ id: "deck-new-upgrade" }),
        expectedVersion: "base0001",
      });

      expect(res.status).toBe(409);

      const body = (await res.json()) as { cause: unknown };
      const conflict = DeckConflictResponseSchema.parse(body.cause);
      expect(conflict.remoteVersion).toBeNull();
      expect(conflict.remoteDeck).toBeNull();
    });
  });

  describe("DELETE /v2/account/decks/:id", () => {
    test("deletes a deck when version matches", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        id: "deck-delete",
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

    test("deletes a deck history when all is true", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        id: "deck-delete-previous",
        version: "prev0001",
      });
      await insertTestDeck(db, {
        id: "deck-delete-current",
        previousDeck: "deck-delete-previous",
        version: "curr0001",
      });
      await db
        .updateTable("deck")
        .set({ next_deck: "deck-delete-current" })
        .where("id", "=", "deck-delete-previous")
        .executeTakeFirst();

      const res = await deleteDeck(
        app,
        sessionCookie,
        "deck-delete-current",
        "curr0001",
        "account",
        true,
      );
      expect(res.status).toBe(204);

      const decks = await db
        .selectFrom("deck")
        .select(["id"])
        .where("id", "in", ["deck-delete-current", "deck-delete-previous"])
        .execute();

      expect(decks).toEqual([]);
    });

    test("returns 409 on delete version conflict", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertTestDeck(db, {
        id: "deck-delete-conflict",
        version: "dddd4444",
      });

      const res = await deleteDeck(
        app,
        sessionCookie,
        "deck-delete-conflict",
        "stale000",
      );
      expect(res.status).toBe(409);

      const body = (await res.json()) as { cause: unknown };
      const conflict = DeckConflictResponseSchema.parse(body.cause);
      expect(conflict.remoteVersion).toBe("dddd4444");
      expect(conflict.remoteDeck?.id).toBe("deck-delete-conflict");
    });

    test("returns a delete conflict when the deck was already removed", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await deleteDeck(
        app,
        sessionCookie,
        "deck-delete-missing",
        "stale000",
      );
      expect(res.status).toBe(409);

      const body = (await res.json()) as { cause: unknown };
      const conflict = DeckConflictResponseSchema.parse(body.cause);
      expect(conflict.remoteVersion).toBeNull();
      expect(conflict.remoteDeck).toBeNull();
    });
  });

  describe("ArkhamDB write-through routes", () => {
    test("creates an ArkhamDB deck remotely and mirrors it locally", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      await insertArkhamDbConnection(db);

      const fetch = vi
        .fn()
        // POST /api/oauth2/deck/new
        .mockResolvedValueOnce(jsonResponse({ msg: 123, success: true }))
        // POST /api/oauth2/deck/save/123
        .mockResolvedValueOnce(jsonResponse({ msg: 123, success: true }))
        // GET /api/oauth2/deck/load/123
        .mockResolvedValueOnce(
          jsonResponse(
            buildArkhamDbApiDeck({
              id: 123,
              name: "Created remotely",
              version: "1.2",
            }),
          ),
        )
        // GET /api/oauth2/decks
        .mockResolvedValueOnce(
          jsonResponse(
            [
              buildArkhamDbApiDeck({
                id: 123,
                name: "Created remotely",
                version: "1.2",
              }),
            ],
            {
              "Last-Modified": "Thu, 04 Jun 2026 12:00:00 GMT",
            },
          ),
        );
      vi.stubGlobal("fetch", fetch);

      const res = await createDeck(
        app,
        sessionCookie,
        baseDeckPayload({
          id: "client-deck",
          name: "Created remotely",
          problem: "too_few_cards",
          source: "arkhamdb",
          version: "1.2",
        }),
      );

      expect(res.status).toBe(200);

      const body = DeckSchema.parse(await res.json());
      expect(body).toMatchObject({
        id: 123,
        name: "Created remotely",
        source: "arkhamdb",
        version: "1.2",
      });
    });

    test("updates an ArkhamDB deck remotely and mirrors it locally", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);
      await insertTestDeck(db, {
        id: "123",
        name: "Original remote deck",
        providerType: "arkhamdb",
        version: "1.1",
      });
      await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 123,
              name: "Original remote deck",
              version: "1.1",
            }),
          ]),
          last_modified: "Thu, 04 Jun 2026 12:00:00 GMT",
        })
        .executeTakeFirstOrThrow();

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          // GET /api/oauth2/deck/load/123
          .mockResolvedValueOnce(
            jsonResponse(
              buildArkhamDbApiDeck({
                id: 123,
                name: "Original remote deck",
                version: "1.1",
              }),
            ),
          )
          // POST /api/oauth2/deck/save/123
          .mockResolvedValueOnce(jsonResponse({ msg: 123, success: true }))
          // GET /api/oauth2/deck/load/123
          .mockResolvedValueOnce(
            jsonResponse(
              buildArkhamDbApiDeck({
                id: 123,
                name: "Updated remotely",
                version: "1.2",
              }),
            ),
          )
          // GET /api/oauth2/decks
          .mockResolvedValueOnce(
            jsonResponse([
              buildArkhamDbApiDeck({
                id: 123,
                name: "Updated remotely",
                version: "1.2",
              }),
            ]),
          ),
      );

      const res = await updateDeck(app, sessionCookie, "123", {
        ...baseDeckPayload({
          id: "123",
          name: "Updated remotely",
          problem: "too_few_cards",
          source: "arkhamdb",
          version: "1.2",
        }),
        expectedVersion: "1.1",
      });

      expect(res.status).toBe(200);

      const body = DeckSchema.parse(await res.json());
      expect(body).toMatchObject({
        id: 123,
        name: "Updated remotely",
        source: "arkhamdb",
        version: "1.2",
      });

      await expect(findArkhamDbSnapshotDecks(db, identity.id)).resolves.toEqual(
        [
          expect.objectContaining({
            id: 123,
            name: "Updated remotely",
            version: "1.2",
          }),
        ],
      );
    });

    test("upgrades an ArkhamDB deck remotely and mirrors the new chain", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);
      await insertTestDeck(db, {
        id: "123",
        name: "Base remote deck",
        providerType: "arkhamdb",
        version: "1.1",
      });
      await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 123,
              name: "Base remote deck",
              version: "1.1",
              xp: 5,
            }),
          ]),
          last_modified: "Thu, 04 Jun 2026 12:00:00 GMT",
        })
        .executeTakeFirstOrThrow();

      const fetch = vi
        .fn()
        // GET /api/oauth2/deck/load/123
        .mockResolvedValueOnce(
          jsonResponse(
            buildArkhamDbApiDeck({
              id: 123,
              name: "Base remote deck",
              version: "1.1",
              xp: 5,
            }),
          ),
        )
        // PUT /api/oauth2/deck/upgrade/123
        .mockResolvedValueOnce(jsonResponse({ msg: 124, success: true }))
        // GET /api/oauth2/deck/load/124
        .mockResolvedValueOnce(
          jsonResponse(
            buildArkhamDbApiDeck({
              id: 124,
              name: "Upgraded remotely",
              previous_deck: 123,
              version: "1.2",
              xp: 8,
            }),
          ),
        )
        // GET /api/oauth2/decks
        .mockResolvedValueOnce(
          jsonResponse([
            buildArkhamDbApiDeck({
              id: 123,
              name: "Base remote deck",
              next_deck: 124,
              version: "1.1",
              xp: 5,
            }),
            buildArkhamDbApiDeck({
              id: 124,
              name: "Upgraded remotely",
              previous_deck: 123,
              version: "1.2",
              xp: 8,
            }),
          ]),
        );
      vi.stubGlobal("fetch", fetch);

      const res = await upgradeDeck(app, sessionCookie, "123", {
        provider: "arkhamdb",
        deck: baseDeckPayload({
          id: "124",
          name: "Upgraded remotely",
          previous_deck: "123",
          problem: "too_few_cards",
          source: "arkhamdb",
          version: "1.2",
          xp: 8,
          xp_spent: 2,
        }),
        expectedVersion: "1.1",
      });

      expect(res.status).toBe(200);
      expect(fetch.mock.calls[1]?.[1]?.body).toBe("meta=%7B%7D&xp=3");

      const body = DeckSchema.parse(await res.json());
      expect(body).toMatchObject({
        id: 124,
        name: "Upgraded remotely",
        previous_deck: 123,
        source: "arkhamdb",
        version: "1.2",
        xp: 8,
      });

      await expect(findArkhamDbSnapshotDecks(db, identity.id)).resolves.toEqual(
        [
          expect.objectContaining({
            id: 123,
            name: "Base remote deck",
            next_deck: 124,
          }),
          expect.objectContaining({
            id: 124,
            name: "Upgraded remotely",
            previous_deck: 123,
            version: "1.2",
          }),
        ],
      );
    });

    test("deletes an ArkhamDB deck remotely and removes the local mirror", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const identity = await insertArkhamDbConnection(db);
      await insertTestDeck(db, {
        id: "123",
        name: "Remote deck",
        providerType: "arkhamdb",
        version: "1.1",
      });
      await db
        .insertInto("arkhamdb_deck_snapshot")
        .values({
          account_identity_id: identity.id,
          decks: JSON.stringify([
            buildArkhamDbApiDeck({
              id: 122,
              name: "Previous remote deck",
              next_deck: 123,
              version: "1.0",
            }),
            buildArkhamDbApiDeck({
              id: 123,
              name: "Remote deck",
              previous_deck: 122,
              version: "1.1",
            }),
          ]),
          last_modified: "Thu, 04 Jun 2026 12:00:00 GMT",
        })
        .executeTakeFirstOrThrow();

      const fetch = vi
        .fn()
        // GET /api/oauth2/deck/load/123
        .mockResolvedValueOnce(
          jsonResponse(
            buildArkhamDbApiDeck({
              id: 123,
              name: "Remote deck",
              version: "1.1",
            }),
          ),
        )
        // DELETE /api/oauth2/deck/delete/123
        .mockResolvedValueOnce(jsonResponse({ success: true }))
        // GET /api/oauth2/decks
        .mockResolvedValueOnce(jsonResponse([]));
      vi.stubGlobal("fetch", fetch);

      const res = await deleteDeck(
        app,
        sessionCookie,
        "123",
        "1.1",
        "arkhamdb",
        true,
      );
      expect(res.status).toBe(204);
      expect(fetch.mock.calls[1]?.[0].toString()).toBe(
        "https://arkhamdb.com/api/oauth2/deck/delete/123?all=true",
      );
      await expect(findArkhamDbSnapshotDecks(db, identity.id)).resolves.toEqual(
        [],
      );

      const deleted = await db
        .selectFrom("deck")
        .select(["id"])
        .where("id", "=", "123")
        .executeTakeFirst();

      expect(deleted).toBeTruthy();
    });
  });
});

function baseDeckPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
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
    source: "account",
    tags: "",
    user_id: null,
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
    id: string;
    name: string;
    nextDeck: string | null;
    previousDeck: string | null;
    providerType: string;
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
      id: overrides.id ?? "deck-seeded",
      next_deck: overrides.nextDeck ?? null,
      prev_deck: overrides.previousDeck ?? null,
      provider_type: overrides.providerType ?? "account",
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

async function insertArkhamDbConnection(db: Database) {
  const account = await db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();

  const identity = await db
    .insertInto("account_identity")
    .values({
      account_id: account.id,
      provider: "arkhamdb",
      provider_user_id: "12345",
      verified_at: new Date(),
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("oauth_token")
    .values({
      account_identity_id: identity.id,
      access_token: "access-token",
      refresh_token: "refresh-token",
      token_expires_at: new Date("2026-06-04T13:00:00.000Z"),
    })
    .executeTakeFirstOrThrow();

  return identity;
}

async function countArkhamDbSnapshots(db: Database, accountIdentityId: string) {
  const row = await db
    .selectFrom("arkhamdb_deck_snapshot")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("account_identity_id", "=", accountIdentityId)
    .executeTakeFirstOrThrow();

  return Number(row.count);
}

async function findArkhamDbSnapshotDecks(
  db: Database,
  accountIdentityId: string,
) {
  const snapshot = await db
    .selectFrom("arkhamdb_deck_snapshot")
    .select(["decks"])
    .where("account_identity_id", "=", accountIdentityId)
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .executeTakeFirstOrThrow();

  return ArkhamDbRemoteDecksSchema.parse(snapshot.decks ?? []);
}

function buildArkhamDbApiDeck(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: 123,
    investigator_code: "01001",
    investigator_name: "Roland Banks",
    meta: "{}",
    name: "Arkham deck",
    problem: "too_few_cards",
    slots: { "01006": 1 },
    version: "1.1",
    xp: 0,
    xp_spent: 0,
    ...overrides,
  };
}

function jsonResponse(body: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
