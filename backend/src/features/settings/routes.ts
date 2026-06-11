import { randomUUID } from "node:crypto";
import {
  SettingsRequestSchema,
  SettingsResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Selectable } from "kysely";
import type { AccountSettings } from "../../db/schema.types.ts";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { upsertRevisionedAccountState } from "../../lib/revisioned-account-state.ts";
import { zodValidator } from "../../lib/validation.ts";
import { findAccountSettingsByAccountId } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountSettings = await findAccountSettingsByAccountId(
    c.get("db"),
    c.get("account").id,
  );
  return c.json(mapAccountSettingsToResponse(accountSettings));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", SettingsRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const payload = c.req.valid("json");

    const accountSettings = await upsertRevisionedAccountState(db, {
      accountId,
      collection: payload.collection,
      expectedRevision: payload.expectedRevision,
      revision: randomUUID(),
      settings: payload.settings,
      table: "account_settings",
    });

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

function mapAccountSettingsToResponse(
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

export default routes;
