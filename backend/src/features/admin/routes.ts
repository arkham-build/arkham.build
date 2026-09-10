import { randomUUID } from "node:crypto";
import {
  type Deck,
  DeckSchema,
  FanMadeProjectInfoSchema,
} from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { findAccountByUsername } from "../../lib/auth/accounts.ts";
import { isExclusionViolation } from "../../lib/db-errors.ts";
import {
  ACCOUNT_PROVIDER_TYPE,
  mapDeckWriteDtoToInsert,
} from "../../lib/deck-mapping.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import {
  createAccountModerationAction,
  endAccountModerationAction,
  findAccountModerationActionById,
  findAppDataVersions,
  listAccountModerationActionsByAccountId,
  setAccountSettingsFlag,
  upsertFanMadeProjectInfo,
} from "./queries.ts";

const routes = new Hono<HonoEnv>();

const adminKeyMiddleware = bearerAuth({
  verifyToken: (token, c: Context<HonoEnv>) =>
    token === c.get("config").ADMIN_API_KEY,
});

routes.get("/up", (c) => c.text("ok"));

routes.get("/version", async (c) => {
  const dataVersions = await findAppDataVersions(c.get("db"));
  if (!dataVersions) throw new Error("could not infer data versions");
  return c.json(dataVersions);
});

routes.post(
  "/fan_made_project_info",
  adminKeyMiddleware,
  zodValidator("json", FanMadeProjectInfoSchema.omit({ id: true })),
  async (c) => {
    const body = c.req.valid("json");

    await upsertFanMadeProjectInfo(c.get("db"), body);

    c.status(201);
    return c.body(null);
  },
);

const ImportAccountBackupDecksQuerySchema = z.object({
  username: z.string().min(1).max(64),
});

const AccountBackupDecksRequestSchema = z.object({
  version: z.number(),
  data: z.object({
    data: z.object({
      decks: z.record(z.string(), DeckSchema),
    }),
  }),
});

routes.post(
  "/account_backup/restore",
  adminKeyMiddleware,
  zodValidator("query", ImportAccountBackupDecksQuerySchema),
  zodValidator("json", AccountBackupDecksRequestSchema),
  async (c) => {
    const db = c.get("db");
    const { username } = c.req.valid("query");
    const backup = c.req.valid("json");

    const account = await findAccountByUsername(db, username);

    if (!account) {
      throw new HTTPException(404, { message: "Account not found" });
    }

    const decks = uniqueDecks(Object.values(backup.data.data.decks));

    await db.transaction().execute(async (tx) => {
      if (!decks.length) return;

      await tx
        .insertInto("deck")
        .values(decks.map((deck) => toDeckInsert(account.id, deck)))
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    });

    c.status(201);
    return c.body(null);
  },
);

const SetAccountSettingsFlagRequestSchema = z.object({
  username: z.string().min(1).max(64),
  flag: z.string().min(1).max(128),
  value: z.boolean(),
});

routes.post(
  "/account_settings/flags",
  adminKeyMiddleware,
  zodValidator("json", SetAccountSettingsFlagRequestSchema),
  async (c) => {
    const db = c.get("db");
    const { flag, username, value } = c.req.valid("json");
    const account = await findAccountByUsername(db, username);

    if (!account) {
      throw new HTTPException(404, { message: "Account not found" });
    }

    const accountSettings = await setAccountSettingsFlag(
      db,
      account.id,
      flag,
      value,
      randomUUID(),
    );

    if (!accountSettings) {
      throw new HTTPException(404, { message: "Account settings not found" });
    }

    return c.json(accountSettings);
  },
);

const AccountModerationActionsQuerySchema = z.object({
  username: z.string().min(1).max(64),
});

routes.get(
  "/account_moderation_actions",
  adminKeyMiddleware,
  zodValidator("query", AccountModerationActionsQuerySchema),
  async (c) => {
    const db = c.get("db");
    const { username } = c.req.valid("query");
    const account = await findAccountByUsername(db, username);

    if (!account) {
      throw new HTTPException(404, { message: "Account not found" });
    }

    return c.json(
      await listAccountModerationActionsByAccountId(db, account.id),
    );
  },
);

const CreateAccountModerationActionRequestSchema = z
  .object({
    username: z.string().min(1).max(64),
    type: z.enum(["warning", "ban"]),
    reason: z.string().min(1),
    endsAt: z.coerce.date().optional(),
    endReason: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      (value.endsAt == null && value.endReason == null) ||
      (value.endsAt != null && value.endReason != null),
    {
      message: "endsAt and endReason must be provided together",
    },
  );

routes.post(
  "/account_moderation_actions",
  adminKeyMiddleware,
  zodValidator("json", CreateAccountModerationActionRequestSchema),
  async (c) => {
    const db = c.get("db");
    const { endReason, endsAt, reason, type, username } = c.req.valid("json");

    const account = await findAccountByUsername(db, username);

    if (!account) {
      throw new HTTPException(404, { message: "Account not found" });
    }

    try {
      const action = await createAccountModerationAction(
        db,
        account.id,
        type,
        reason,
        endsAt,
        endReason,
      );

      c.status(201);
      return c.json(action);
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new HTTPException(409, {
          message: "Account already has an active ban",
        });
      }

      throw error;
    }
  },
);

const EndAccountModerationActionRequestSchema = z.object({
  endReason: z.string().min(1),
});

routes.post(
  "/account_moderation_actions/:id/end",
  adminKeyMiddleware,
  zodValidator("json", EndAccountModerationActionRequestSchema),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const { endReason } = c.req.valid("json");
    const action = await findAccountModerationActionById(db, id);

    if (!action) {
      throw new HTTPException(404, { message: "Moderation action not found" });
    }

    const now = new Date();

    if (action.ends_at != null && action.ends_at <= now) {
      throw new HTTPException(409, {
        message: "Moderation action already ended",
      });
    }

    return c.json(await endAccountModerationAction(db, id, now, endReason));
  },
);

function uniqueDecks(decks: Deck[]) {
  const ids = new Set<string>();
  const result: Deck[] = [];

  for (const deck of decks) {
    const id = String(deck.id);
    if (ids.has(id)) continue;

    ids.add(id);
    result.push(deck);
  }

  return result;
}

function toDeckInsert(accountId: string, deck: Deck) {
  const {
    date_creation,
    date_update,
    id,
    source: _,
    user_id: __,
    version,
    ...deckPayload
  } = deck;

  return {
    ...mapDeckWriteDtoToInsert(deckPayload),
    account_id: accountId,
    created_at: parseBackupTimestamp(date_creation, id),
    id: String(id),
    provider_type: ACCOUNT_PROVIDER_TYPE,
    updated_at: parseBackupTimestamp(date_update, id),
    version,
  };
}

function parseBackupTimestamp(value: string, deckId: Deck["id"]) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new HTTPException(400, {
      message: `Invalid backup timestamp for deck ${String(deckId)}`,
    });
  }

  return date;
}

export default routes;
