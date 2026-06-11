import { FanMadeProjectInfoSchema } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { findAccountByUsername } from "../../lib/auth/accounts.ts";
import { isExclusionViolation } from "../../lib/db-errors.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import {
  createAccountModerationAction,
  endAccountModerationAction,
  findAccountModerationActionById,
  findAppDataVersions,
  listAccountModerationActionsByAccountId,
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

export default routes;
