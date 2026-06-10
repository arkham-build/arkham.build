import { describe, expect } from "vitest";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

describe("Admin routes", () => {
  describe("GET /admin/account_moderation_actions", () => {
    test("lists moderation actions by username", async ({ dependencies }) => {
      const { app, config } = dependencies;

      await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "warning",
          reason: "list warning reason",
        }),
      });
      await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "ban",
          reason: "list ban reason",
          endsAt: "2030-01-01T00:00:00.000Z",
          endReason: "list ban expires",
        }),
      });

      const res = await app.request(
        `/admin/account_moderation_actions?username=${TEST_ACCOUNT.name}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          },
        },
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject([
        {
          account_id: expect.any(String),
          scope: "account",
          type: "ban",
          reason: "list ban reason",
          end_reason: "list ban expires",
        },
        {
          account_id: expect.any(String),
          scope: "account",
          type: "warning",
          reason: "list warning reason",
        },
      ]);
    });
  });

  describe("POST /admin/account_moderation_actions", () => {
    test("requires admin api key", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "warning",
          reason: "warning reason",
        }),
      });

      expect(res.status).toBe(401);
    });

    test("creates a warning", async ({ dependencies }) => {
      const { app, config, db } = dependencies;

      const res = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "warning",
          reason: "warning reason",
        }),
      });

      expect(res.status).toBe(201);

      const action = await db
        .selectFrom("account_moderation_action")
        .select(["scope", "type", "reason"])
        .where("reason", "=", "warning reason")
        .executeTakeFirstOrThrow();

      expect(action).toMatchObject({
        scope: "account",
        type: "warning",
        reason: "warning reason",
      });
    });

    test("creates a ban", async ({ dependencies }) => {
      const { app, config, db } = dependencies;

      const res = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "ban",
          reason: "ban reason",
        }),
      });

      expect(res.status).toBe(201);

      const action = await db
        .selectFrom("account_moderation_action")
        .select(["scope", "type", "reason", "ends_at"])
        .where("reason", "=", "ban reason")
        .executeTakeFirstOrThrow();

      expect(action).toMatchObject({
        scope: "account",
        type: "ban",
        reason: "ban reason",
        ends_at: null,
      });
    });

    test("creates a ban with ends_at", async ({ dependencies }) => {
      const { app, config, db } = dependencies;
      const endsAt = "2030-01-01T00:00:00.000Z";

      const res = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "ban",
          reason: "temporary ban reason",
          endsAt,
          endReason: "temporary ban expires",
        }),
      });

      expect(res.status).toBe(201);

      const action = await db
        .selectFrom("account_moderation_action")
        .select(["reason", "ends_at", "end_reason"])
        .where("reason", "=", "temporary ban reason")
        .executeTakeFirstOrThrow();

      expect(action).toMatchObject({
        reason: "temporary ban reason",
        ends_at: new Date(endsAt),
        end_reason: "temporary ban expires",
      });
    });

    test("does not create overlapping active bans", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const firstRes = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "ban",
          reason: "first ban",
        }),
      });

      expect(firstRes.status).toBe(201);

      const secondRes = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "ban",
          reason: "second ban",
        }),
      });

      expect(secondRes.status).toBe(409);
      expect(await secondRes.text()).toContain(
        "Account already has an active ban",
      );
    });
  });

  describe("POST /admin/account_moderation_actions/:id/end", () => {
    test("ends an active moderation action", async ({ dependencies }) => {
      const { app, config, db } = dependencies;

      const createRes = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "warning",
          reason: "end warning reason",
        }),
      });

      const { id } = (await createRes.json()) as { id: string };

      const endRes = await app.request(
        `/admin/account_moderation_actions/${id}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.ADMIN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endReason: "manual end" }),
        },
      );

      expect(endRes.status).toBe(200);

      const action = await db
        .selectFrom("account_moderation_action")
        .select(["ends_at", "end_reason"])
        .where("id", "=", id)
        .executeTakeFirstOrThrow();

      expect(action.end_reason).toBe("manual end");
      expect(action.ends_at).not.toBeNull();
    });

    test("does not end an already ended moderation action", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const createRes = await app.request("/admin/account_moderation_actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          type: "warning",
          reason: "already ended reason",
        }),
      });

      const { id } = (await createRes.json()) as { id: string };

      const firstEndRes = await app.request(
        `/admin/account_moderation_actions/${id}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.ADMIN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endReason: "manual end" }),
        },
      );

      expect(firstEndRes.status).toBe(200);

      const secondEndRes = await app.request(
        `/admin/account_moderation_actions/${id}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.ADMIN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endReason: "manual end again" }),
        },
      );

      expect(secondEndRes.status).toBe(409);
      expect(await secondEndRes.text()).toContain(
        "Moderation action already ended",
      );
    });
  });
});
