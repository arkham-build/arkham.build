import { FolderSyncResponseSchema } from "@arkham-build/shared";
import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("Folders routes", () => {
  describe("GET /v2/account/folders", () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await app.request("/v2/account/folders", { method: "GET" });
      expect(res.status).toBe(401);
    });

    test("returns null state when no row exists", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;
      const res = await app.request("/v2/account/folders", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(res.status).toBe(200);
      expect(
        FolderSyncResponseSchema.parse(await res.json()),
      ).toMatchInlineSnapshot(`
        {
          "revision": null,
          "state": null,
        }
      `);
    });
  });

  describe("PUT /v2/account/folders", () => {
    test("creates folders when expected revision is null", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            deckFolders: { deck: "folder" },
            folders: {
              folder: { id: "folder", name: "Folder" },
            },
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(FolderSyncResponseSchema.parse(await res.json())).toMatchObject({
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

      const res = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          state: {
            deckFolders: {},
            folders: {},
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    test("updates folders when revision matches", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            deckFolders: { deck: "folder" },
            folders: {
              folder: { id: "folder", name: "Folder" },
            },
          },
        }),
      });

      const created = FolderSyncResponseSchema.parse(await createRes.json());

      const updateRes = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: created.revision,
          state: {
            deckFolders: { deck: "folder-2" },
            folders: {
              "folder-2": { id: "folder-2", name: "Folder 2" },
            },
          },
        }),
      });

      expect(updateRes.status).toBe(200);

      const updated = FolderSyncResponseSchema.parse(await updateRes.json());

      expect(updated).toMatchObject({
        revision: expect.not.stringMatching(created.revision as string),
        state: {
          deckFolders: { deck: "folder-2" },
          folders: {
            "folder-2": { id: "folder-2", name: "Folder 2" },
          },
        },
      });

      const getRes = await app.request("/v2/account/folders", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(FolderSyncResponseSchema.parse(await getRes.json())).toEqual(
        updated,
      );
    });

    test("returns 409 when revision is stale", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const createRes = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: null,
          state: {
            deckFolders: { deck: "folder" },
            folders: {
              folder: { id: "folder", name: "Folder" },
            },
          },
        }),
      });
      const created = FolderSyncResponseSchema.parse(await createRes.json());

      const updateRes = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: created.revision,
          state: {
            deckFolders: { deck: "folder-2" },
            folders: {
              "folder-2": { id: "folder-2", name: "Folder 2" },
            },
          },
        }),
      });
      const updated = FolderSyncResponseSchema.parse(await updateRes.json());

      const conflictRes = await app.request("/v2/account/folders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          expectedRevision: created.revision,
          state: {
            deckFolders: { deck: "folder-3" },
            folders: {
              "folder-3": { id: "folder-3", name: "Folder 3" },
            },
          },
        }),
      });

      expect(conflictRes.status).toBe(409);

      const getRes = await app.request("/v2/account/folders", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });
      expect(FolderSyncResponseSchema.parse(await getRes.json())).toEqual(
        updated,
      );
    });
  });
});
