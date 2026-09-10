import { SettingsResponseSchema } from "@arkham-build/shared";
import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("Settings routes", () => {
  describe("GET /v2/account/settings", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await app.request("/v2/account/settings", { method: "GET" });
      expect(res.status).toBe(401);
    });

    test("returns null settings when no row exists", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;
      const res = await app.request("/v2/account/settings", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(res.status).toBe(200);
      expect(SettingsResponseSchema.parse(await res.json()))
        .toMatchInlineSnapshot(`
        {
          "collection": null,
          "revision": null,
          "settings": null,
        }
      `);
    });
  });

  describe("PUT /v2/account/settings", () => {
    test("creates settings when expected revision is null", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 2 },
          expectedRevision: null,
          settings: { locale: "en", showAllCards: false },
        }),
      });

      expect(res.status).toBe(200);
      expect(SettingsResponseSchema.parse(await res.json())).toMatchObject({
        collection: { core: 2 },
        settings: { locale: "en", showAllCards: false },
        revision: expect.any(String),
      });
    });

    test("returns 400 for invalid payload", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 1 },
          settings: { locale: "en" },
        }),
      });

      expect(res.status).toBe(400);
    });

    test("updates settings when revision matches", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 1 },
          expectedRevision: null,
          settings: { locale: "en" },
        }),
      });

      const created = SettingsResponseSchema.parse(await createRes.json());

      const updateRes = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 2, dunwich: 1 },
          expectedRevision: created.revision,
          settings: { locale: "de", showAllCards: true },
        }),
      });

      expect(updateRes.status).toBe(200);

      const updated = SettingsResponseSchema.parse(await updateRes.json());

      expect(updated).toMatchObject({
        collection: { core: 2, dunwich: 1 },
        settings: { locale: "de", showAllCards: true },
        revision: expect.not.stringMatching(created.revision as string),
      });

      const getRes = await app.request("/v2/account/settings", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(SettingsResponseSchema.parse(await getRes.json())).toEqual(
        updated,
      );
    });

    test("returns 409 when revision is stale", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 1 },
          expectedRevision: null,
          settings: { locale: "en" },
        }),
      });
      const created = SettingsResponseSchema.parse(await createRes.json());

      const updateRes = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 2 },
          expectedRevision: created.revision,
          settings: { locale: "fr" },
        }),
      });
      const updated = SettingsResponseSchema.parse(await updateRes.json());

      const conflictRes = await app.request("/v2/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          collection: { core: 3 },
          expectedRevision: created.revision,
          settings: { locale: "it" },
        }),
      });

      expect(conflictRes.status).toBe(409);

      const getRes = await app.request("/v2/account/settings", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(SettingsResponseSchema.parse(await getRes.json())).toEqual(
        updated,
      );
    });
  });
});
