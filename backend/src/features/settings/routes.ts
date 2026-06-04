import { randomUUID } from "node:crypto";
import { SettingsRequestSchema } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv, SessionAuthHonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/lib/session-auth-middleware.ts";
import { mapAccountSettingsToResponse } from "./mapping.ts";
import { findAccountSettingsByAccountId } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountSettings = await findAccountSettingsByAccountId(
    c.get("db"),
    getAccountId(c),
  );
  return c.json(mapAccountSettingsToResponse(accountSettings));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", SettingsRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = getAccountId(c);
    const payload = c.req.valid("json");

    const revision = randomUUID();
    const accountSettings =
      payload.expectedRevision == null
        ? await db
            .insertInto("account_settings")
            .values({
              account_id: accountId,
              collection: payload.collection,
              revision,
              settings: payload.settings,
            })
            .onConflict((oc) => oc.column("account_id").doNothing())
            .returning(["settings", "collection", "revision"])
            .executeTakeFirst()
        : await db
            .insertInto("account_settings")
            .values({
              account_id: accountId,
              collection: payload.collection,
              revision,
              settings: payload.settings,
            })
            .onConflict((oc) =>
              oc
                .column("account_id")
                .doUpdateSet({
                  collection: payload.collection,
                  revision,
                  settings: payload.settings,
                })
                .where(
                  "account_settings.revision",
                  "=",
                  payload.expectedRevision,
                ),
            )
            .returning(["settings", "collection", "revision"])
            .executeTakeFirst();

    if (!accountSettings) {
      const current = await findAccountSettingsByAccountId(db, accountId);
      throw new HTTPException(409, {
        message: "Stored setting revision does not match the expected revision",
        cause: mapAccountSettingsToResponse(current),
      });
    }

    return c.json(mapAccountSettingsToResponse(accountSettings));
  },
);

function getAccountId(c: Context<SessionAuthHonoEnv>) {
  return c.get("account").id;
}

export default routes;
