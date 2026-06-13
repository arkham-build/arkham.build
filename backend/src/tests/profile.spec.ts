import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("Profile routes", () => {
  describe("PATCH /v2/account/profile", () => {
    test("returns 401 when not authenticated", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "updated-user" }),
      });

      expect(res.status).toBe(401);
    });

    test("updates the current username", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;

      const res = await app.request("/v2/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ username: "updated-user" }),
      });

      expect(res.status).toBe(200);

      const account = await db
        .selectFrom("account")
        .select(["name"])
        .where("name", "=", "updated-user")
        .executeTakeFirst();

      expect(account?.name).toBe("updated-user");
    });

    test("rejects a duplicate username", async ({ dependencies }) => {
      const { app, db, sessionCookie } = dependencies;

      await db
        .insertInto("account")
        .values({ name: "taken-user" })
        .executeTakeFirstOrThrow();

      const res = await app.request("/v2/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ username: "taken-user" }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({
        message: "Username is already taken",
      });
    });
  });
});
