import { CardTagsSyncResponseSchema } from "@arkham-build/shared";
import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("Card tags routes", () => {
  describe("GET /v2/account/card-tags", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await app.request("/v2/account/card-tags", {
        method: "GET",
      });
      expect(res.status).toBe(401);
    });

    test("returns null state when no row exists", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;
      const res = await app.request("/v2/account/card-tags", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(res.status).toBe(200);
      expect(CardTagsSyncResponseSchema.parse(await res.json()))
        .toMatchInlineSnapshot(`
        {
          "revision": null,
          "state": null,
        }
      `);
    });
  });

  describe("PUT /v2/account/card-tags", () => {
    test("creates card tags when expected revision is null", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            cardTags: { "01020": ["Tag"] },
            favorites: { "01020": true },
            tags: ["Tag"],
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(CardTagsSyncResponseSchema.parse(await res.json())).toMatchObject({
        revision: expect.any(String),
        state: {
          cardTags: { "01020": ["Tag"] },
          favorites: { "01020": true },
          tags: ["Tag"],
        },
      });
    });

    test("returns 400 for invalid payload", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            cardTags: { "01020": ["Missing"] },
            favorites: {},
            tags: [],
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    test("updates card tags when revision matches", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            cardTags: { "01020": ["Tag"] },
            favorites: {},
            tags: ["Tag"],
          },
        }),
      });

      const created = CardTagsSyncResponseSchema.parse(await createRes.json());

      const updateRes = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: created.revision,
          state: {
            cardTags: { "01021": ["Renamed"] },
            favorites: {},
            tags: ["Renamed"],
          },
        }),
      });

      expect(updateRes.status).toBe(200);

      const updated = CardTagsSyncResponseSchema.parse(await updateRes.json());

      expect(updated).toMatchObject({
        revision: expect.not.stringMatching(created.revision as string),
        state: {
          cardTags: { "01021": ["Renamed"] },
          favorites: {},
          tags: ["Renamed"],
        },
      });

      const getRes = await app.request("/v2/account/card-tags", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(CardTagsSyncResponseSchema.parse(await getRes.json())).toEqual(
        updated,
      );
    });

    test("returns 409 when revision is stale", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            cardTags: { "01020": ["Tag"] },
            favorites: {},
            tags: ["Tag"],
          },
        }),
      });
      const created = CardTagsSyncResponseSchema.parse(await createRes.json());

      const updateRes = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: created.revision,
          state: {
            cardTags: { "01021": ["Tag"] },
            favorites: {},
            tags: ["Tag"],
          },
        }),
      });
      const updated = CardTagsSyncResponseSchema.parse(await updateRes.json());

      const conflictRes = await app.request("/v2/account/card-tags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: created.revision,
          state: {
            cardTags: { "01022": ["Tag"] },
            favorites: {},
            tags: ["Tag"],
          },
        }),
      });

      expect(conflictRes.status).toBe(409);

      const getRes = await app.request("/v2/account/card-tags", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(CardTagsSyncResponseSchema.parse(await getRes.json())).toEqual(
        updated,
      );
    });
  });
});
