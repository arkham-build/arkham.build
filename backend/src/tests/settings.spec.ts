import {
  type SettingsResponse,
  SettingsResponseSchema,
} from "@arkham-build/shared";
import type { Hono } from "hono";
import { describe, expect } from "vitest";
import type { HonoEnv } from "../lib/hono-env.ts";
import { test } from "./test-utils.ts";

function getSettings(app: Hono<HonoEnv>, cookie?: string) {
  return app.request("/v2/settings", {
    method: "GET",
    ...(cookie ? { headers: { Cookie: cookie } } : {}),
  });
}

function putSettings(
  app: Hono<HonoEnv>,
  cookie: string,
  payload: Record<string, unknown>,
) {
  return app.request("/v2/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

async function readSettings(res: Response): Promise<SettingsResponse> {
  return SettingsResponseSchema.parse(await res.json());
}

describe("Settings routes", () => {
  describe("GET /v2/settings", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await getSettings(app);
      expect(res.status).toBe(401);
    });

    test("returns null settings when no row exists", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;
      const res = await getSettings(app, sessionCookie);
      expect(res.status).toBe(200);
      expect(await readSettings(res)).toMatchInlineSnapshot(`
        {
          "collection": null,
          "revision": null,
          "settings": null,
        }
      `);
    });
  });

  describe("PUT /v2/settings", () => {
    test("creates settings when expected revision is null", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await putSettings(app, sessionCookie, {
        collection: { core: 2 },
        expectedRevision: null,
        settings: { locale: "en", showAllCards: false },
      });

      expect(res.status).toBe(200);

      const body = await readSettings(res);

      expect(body).toMatchObject({
        collection: { core: 2 },
        settings: { locale: "en", showAllCards: false },
        revision: expect.any(String),
      });
    });

    test("returns 400 for invalid payload", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await putSettings(app, sessionCookie, {
        collection: { core: 1 },
        settings: { locale: "en" },
      });

      expect(res.status).toBe(400);
    });

    test("updates settings when revision matches", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await putSettings(app, sessionCookie, {
        collection: { core: 1 },
        expectedRevision: null,
        settings: { locale: "en" },
      });

      const created = await readSettings(createRes);

      const updateRes = await putSettings(app, sessionCookie, {
        collection: { core: 2, dunwich: 1 },
        expectedRevision: created.revision,
        settings: { locale: "de", showAllCards: true },
      });

      expect(updateRes.status).toBe(200);

      const updated = await readSettings(updateRes);

      expect(updated).toMatchObject({
        collection: { core: 2, dunwich: 1 },
        settings: { locale: "de", showAllCards: true },
        revision: expect.not.stringMatching(created.revision as string),
      });

      const getRes = await getSettings(app, sessionCookie);
      expect(await readSettings(getRes)).toEqual(updated);
    });

    test("returns 409 when revision is stale", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await putSettings(app, sessionCookie, {
        collection: { core: 1 },
        expectedRevision: null,
        settings: { locale: "en" },
      });
      const created = await readSettings(createRes);

      const updateRes = await putSettings(app, sessionCookie, {
        collection: { core: 2 },
        expectedRevision: created.revision,
        settings: { locale: "fr" },
      });
      const updated = await readSettings(updateRes);

      const conflictRes = await putSettings(app, sessionCookie, {
        collection: { core: 3 },
        expectedRevision: created.revision,
        settings: { locale: "it" },
      });

      expect(conflictRes.status).toBe(409);

      const getRes = await getSettings(app, sessionCookie);
      expect(await readSettings(getRes)).toEqual(updated);
    });
  });
});
