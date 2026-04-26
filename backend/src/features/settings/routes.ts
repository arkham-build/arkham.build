import { randomUUID } from "node:crypto";
import {
  SettingsRequestSchema,
  SettingsResponseSchema,
} from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Selectable } from "kysely";
import type { Database } from "../../db/db.ts";
import type { AccountSettings } from "../../db/schema.types.ts";
import type { HonoEnv, SessionAuthHonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/session-auth-middleware.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountSettings = await getAccountSettings(
    c.get("db"),
    getAccountId(c),
  );
  return c.json(serializeSettings(accountSettings));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", SettingsRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = getAccountId(c);
    const payload = c.req.valid("json");

    const current = await getAccountSettings(db, accountId);
    const currentRevision = current?.revision ?? null;

    if (currentRevision !== payload.expectedRevision) {
      throw new HTTPException(409, {
        message: "Stored setting revision does not match the expected revision",
        cause: serializeSettings(current),
      });
    }

    const revision = randomUUID();

    const accountSettings = await db
      .insertInto("account_settings")
      .values({
        account_id: accountId,
        collection: payload.collection,
        revision,
        settings: payload.settings,
      })
      .onConflict((oc) =>
        oc.column("account_id").doUpdateSet({
          collection: payload.collection,
          revision,
          settings: payload.settings,
        }),
      )
      .returning(["settings", "collection", "revision"])
      .executeTakeFirstOrThrow();

    return c.json(serializeSettings(accountSettings));
  },
);

export default routes;

function getAccountId(c: Context<SessionAuthHonoEnv>) {
  return c.get("account").id;
}

async function getAccountSettings(db: Database, accountId: string) {
  return await db
    .selectFrom("account_settings")
    .select(["settings", "collection", "revision"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

function serializeSettings(
  accountSettings:
    | Pick<Selectable<AccountSettings>, "collection" | "revision" | "settings">
    | undefined,
) {
  return SettingsResponseSchema.parse({
    collection: accountSettings?.collection ?? null,
    revision: accountSettings?.revision ?? null,
    settings: accountSettings?.settings ?? null,
  });
}
