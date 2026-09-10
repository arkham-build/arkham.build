import { describe, expect } from "vitest";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

describe("Admin routes", () => {
  describe("POST /admin/account_backup/restore", () => {
    test("imports backup decks preserving ids and links", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;

      const res = await app.request(
        `/admin/account_backup/restore?username=${TEST_ACCOUNT.name}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.ADMIN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            makeBackup([
              makeBackupDeck({
                id: "backup-root",
                next_deck: "backup-upgrade",
                name: "Backup root",
              }),
              makeBackupDeck({
                id: "backup-upgrade",
                previous_deck: "backup-root",
                name: "Backup upgrade",
                version: "0.2",
              }),
            ]),
          ),
        },
      );

      expect(res.status).toBe(201);

      const rows = await db
        .selectFrom("deck")
        .select([
          "id",
          "name",
          "next_deck",
          "prev_deck",
          "provider_type",
          "investigator_name",
          "created_at",
          "updated_at",
        ])
        .where("id", "in", ["backup-root", "backup-upgrade"])
        .orderBy("id")
        .execute();

      expect(rows).toEqual([
        {
          id: "backup-root",
          name: "Backup root",
          next_deck: "backup-upgrade",
          prev_deck: null,
          provider_type: "account",
          investigator_name: "",
          created_at: new Date("2025-01-01T00:00:00.000Z"),
          updated_at: new Date("2025-01-02T00:00:00.000Z"),
        },
        {
          id: "backup-upgrade",
          name: "Backup upgrade",
          next_deck: null,
          prev_deck: "backup-root",
          provider_type: "account",
          investigator_name: "",
          created_at: new Date("2025-01-01T00:00:00.000Z"),
          updated_at: new Date("2025-01-02T00:00:00.000Z"),
        },
      ]);
    });

    test("ignores existing deck ids", async ({ dependencies }) => {
      const { app, config, db } = dependencies;
      const account = await db
        .selectFrom("account")
        .select("id")
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      await db
        .insertInto("deck")
        .values({
          account_id: account.id,
          description: "",
          id: "backup-existing",
          investigator_code: "01001",
          investigator_name: "Roland Banks",
          meta: {},
          name: "Existing deck",
          provider_type: "account",
          slots: { "01006": 1 },
          version: "old",
        })
        .execute();

      const res = await app.request(
        `/admin/account_backup/restore?username=${TEST_ACCOUNT.name}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.ADMIN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            makeBackup([
              makeBackupDeck({
                id: "backup-existing",
                name: "Should not update",
              }),
              makeBackupDeck({ id: "backup-new", name: "New deck" }),
            ]),
          ),
        },
      );

      expect(res.status).toBe(201);

      const rows = await db
        .selectFrom("deck")
        .select(["id", "name"])
        .where("id", "in", ["backup-existing", "backup-new"])
        .orderBy("id")
        .execute();

      expect(rows).toEqual([
        { id: "backup-existing", name: "Existing deck" },
        { id: "backup-new", name: "New deck" },
      ]);
    });
  });

  describe("POST /admin/account_settings/flags", () => {
    test("requires admin api key", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/admin/account_settings/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          flag: "adminFlag",
          value: true,
        }),
      });

      expect(res.status).toBe(401);
    });

    test("returns 404 when account does not exist", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const res = await app.request("/admin/account_settings/flags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "missing-account",
          flag: "adminFlag",
          value: true,
        }),
      });

      expect(res.status).toBe(404);
      expect(await res.text()).toContain("Account not found");
    });

    test("returns 404 when account has no settings", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const res = await app.request("/admin/account_settings/flags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          flag: "adminFlag",
          value: true,
        }),
      });

      expect(res.status).toBe(404);
      expect(await res.text()).toContain("Account settings not found");
    });

    test("sets a settings flag", async ({ dependencies }) => {
      const { app, config, db } = dependencies;
      const account = await db
        .selectFrom("account")
        .select("id")
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      const before = await db
        .insertInto("account_settings")
        .values({
          account_id: account.id,
          collection: { core: 1 },
          settings: {
            flags: { existingFlag: false },
            locale: "en",
            showAllCards: true,
          },
        })
        .returning("revision")
        .executeTakeFirstOrThrow();

      const res = await app.request("/admin/account_settings/flags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          flag: "adminFlag",
          value: true,
        }),
      });

      expect(res.status).toBe(200);

      const row = await db
        .selectFrom("account_settings")
        .select(["revision", "settings"])
        .where("account_id", "=", account.id)
        .executeTakeFirstOrThrow();

      expect(row.revision).not.toBe(before.revision);
      expect(row.settings).toMatchObject({
        flags: { adminFlag: true, existingFlag: false },
        locale: "en",
        showAllCards: true,
      });
    });

    test("creates settings flags when missing", async ({ dependencies }) => {
      const { app, config, db } = dependencies;
      const account = await db
        .selectFrom("account")
        .select("id")
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_settings")
        .values({
          account_id: account.id,
          collection: { core: 1 },
          settings: { locale: "en" },
        })
        .execute();

      const res = await app.request("/admin/account_settings/flags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          flag: "adminFlag",
          value: true,
        }),
      });

      expect(res.status).toBe(200);

      const row = await db
        .selectFrom("account_settings")
        .select("settings")
        .where("account_id", "=", account.id)
        .executeTakeFirstOrThrow();

      expect(row.settings).toMatchObject({
        flags: { adminFlag: true },
        locale: "en",
      });
    });

    test("updates an existing settings flag", async ({ dependencies }) => {
      const { app, config, db } = dependencies;
      const account = await db
        .selectFrom("account")
        .select("id")
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_settings")
        .values({
          account_id: account.id,
          collection: { core: 1 },
          settings: { flags: { adminFlag: false } },
        })
        .execute();

      const res = await app.request("/admin/account_settings/flags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: TEST_ACCOUNT.name,
          flag: "adminFlag",
          value: true,
        }),
      });

      expect(res.status).toBe(200);

      const row = await db
        .selectFrom("account_settings")
        .select("settings")
        .where("account_id", "=", account.id)
        .executeTakeFirstOrThrow();

      expect(row.settings).toMatchObject({ flags: { adminFlag: true } });
    });
  });

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

type BackupDeck = {
  date_creation: string;
  date_update: string;
  description_md: string;
  exile_string: string | null;
  id: string;
  ignoreDeckLimitSlots: Record<string, number> | null;
  investigator_code: string;
  meta: string;
  name: string;
  next_deck: string | null;
  previous_deck: string | null;
  problem: string | null;
  sideSlots: Record<string, number> | null;
  slots: Record<string, number>;
  taboo_id: number | null;
  tags: string;
  version: string;
  xp_adjustment: number | null;
  xp_spent: number | null;
  xp: number | null;
};

function makeBackup(decks: BackupDeck[]) {
  return {
    version: 7,
    data: {
      data: {
        decks: Object.fromEntries(decks.map((deck) => [deck.id, deck])),
      },
    },
  };
}

function makeBackupDeck(overrides: Partial<BackupDeck> = {}): BackupDeck {
  return {
    date_creation: "2025-01-01T00:00:00.000Z",
    date_update: "2025-01-02T00:00:00.000Z",
    description_md: "",
    exile_string: null,
    id: "backup-deck",
    ignoreDeckLimitSlots: null,
    investigator_code: "01001",
    meta: "{}",
    name: "Backup deck",
    next_deck: null,
    previous_deck: null,
    problem: null,
    sideSlots: null,
    slots: { "01006": 1, "01007": 1 },
    taboo_id: null,
    tags: "",
    version: "0.1",
    xp_adjustment: null,
    xp_spent: 0,
    xp: 0,
    ...overrides,
  };
}
