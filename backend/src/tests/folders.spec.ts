import {
  type FolderSyncResponse,
  FolderSyncResponseSchema,
} from "@arkham-build/shared";
import type { Hono } from "hono";
import { describe, expect } from "vitest";
import type { HonoEnv } from "../lib/hono-env.ts";
import { test } from "./test-utils.ts";

function getFolders(app: Hono<HonoEnv>, cookie?: string) {
  return app.request("/v2/folders", {
    method: "GET",
    ...(cookie ? { headers: { Cookie: cookie } } : {}),
  });
}

function putFolders(
  app: Hono<HonoEnv>,
  cookie: string,
  payload: Record<string, unknown>,
) {
  return app.request("/v2/folders", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

async function readFolders(res: Response): Promise<FolderSyncResponse> {
  return FolderSyncResponseSchema.parse(await res.json());
}

describe("Folders routes", () => {
  describe("GET /v2/folders", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await getFolders(app);
      expect(res.status).toBe(401);
    });

    test("returns null state when no row exists", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;
      const res = await getFolders(app, sessionCookie);
      expect(res.status).toBe(200);
      expect(await readFolders(res)).toMatchInlineSnapshot(`
        {
          "revision": null,
          "state": null,
        }
      `);
    });
  });

  describe("PUT /v2/folders", () => {
    test("creates folders when expected revision is null", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await putFolders(app, sessionCookie, {
        expectedRevision: null,
        state: {
          deckFolders: { deck: "folder" },
          folders: {
            folder: { id: "folder", name: "Folder" },
          },
        },
      });

      expect(res.status).toBe(200);

      const body = await readFolders(res);

      expect(body).toMatchObject({
        revision: expect.any(String),
        state: {
          deckFolders: { deck: "folder" },
          folders: {
            folder: { id: "folder", name: "Folder" },
          },
        },
      });
    });

    test("returns 400 for invalid payload", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await putFolders(app, sessionCookie, {
        state: {
          deckFolders: {},
          folders: {},
        },
      });

      expect(res.status).toBe(400);
    });

    test("updates folders when revision matches", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await putFolders(app, sessionCookie, {
        expectedRevision: null,
        state: {
          deckFolders: { deck: "folder" },
          folders: {
            folder: { id: "folder", name: "Folder" },
          },
        },
      });

      const created = await readFolders(createRes);

      const updateRes = await putFolders(app, sessionCookie, {
        expectedRevision: created.revision,
        state: {
          deckFolders: { deck: "folder-2" },
          folders: {
            "folder-2": { id: "folder-2", name: "Folder 2" },
          },
        },
      });

      expect(updateRes.status).toBe(200);

      const updated = await readFolders(updateRes);

      expect(updated).toMatchObject({
        revision: expect.not.stringMatching(created.revision as string),
        state: {
          deckFolders: { deck: "folder-2" },
          folders: {
            "folder-2": { id: "folder-2", name: "Folder 2" },
          },
        },
      });

      const getRes = await getFolders(app, sessionCookie);
      expect(await readFolders(getRes)).toEqual(updated);
    });

    test("returns 409 when revision is stale", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await putFolders(app, sessionCookie, {
        expectedRevision: null,
        state: {
          deckFolders: { deck: "folder" },
          folders: {
            folder: { id: "folder", name: "Folder" },
          },
        },
      });
      const created = await readFolders(createRes);

      const updateRes = await putFolders(app, sessionCookie, {
        expectedRevision: created.revision,
        state: {
          deckFolders: { deck: "folder-2" },
          folders: {
            "folder-2": { id: "folder-2", name: "Folder 2" },
          },
        },
      });
      const updated = await readFolders(updateRes);

      const conflictRes = await putFolders(app, sessionCookie, {
        expectedRevision: created.revision,
        state: {
          deckFolders: { deck: "folder-3" },
          folders: {
            "folder-3": { id: "folder-3", name: "Folder 3" },
          },
        },
      });

      expect(conflictRes.status).toBe(409);

      const getRes = await getFolders(app, sessionCookie);
      expect(await readFolders(getRes)).toEqual(updated);
    });
  });
});
