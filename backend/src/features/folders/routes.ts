import { randomUUID } from "node:crypto";
import { FolderSyncRequestSchema } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv, SessionAuthHonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/lib/session-auth-middleware.ts";
import { mapAccountFolderStateToSyncResponse } from "./mapping.ts";
import { findAccountFolderStateByAccountId } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountFolderState = await findAccountFolderStateByAccountId(
    c.get("db"),
    getAccountId(c),
  );
  return c.json(mapAccountFolderStateToSyncResponse(accountFolderState));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", FolderSyncRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = getAccountId(c);
    const payload = c.req.valid("json");

    const revision = randomUUID();
    const accountFolderState =
      payload.expectedRevision == null
        ? await db
            .insertInto("account_folder")
            .values({
              account_id: accountId,
              revision,
              state: payload.state,
            })
            .onConflict((oc) => oc.column("account_id").doNothing())
            .returning(["state", "revision"])
            .executeTakeFirst()
        : await db
            .insertInto("account_folder")
            .values({
              account_id: accountId,
              revision,
              state: payload.state,
            })
            .onConflict((oc) =>
              oc
                .column("account_id")
                .doUpdateSet({
                  revision,
                  state: payload.state,
                })
                .where(
                  "account_folder.revision",
                  "=",
                  payload.expectedRevision,
                ),
            )
            .returning(["state", "revision"])
            .executeTakeFirst();

    if (!accountFolderState) {
      const current = await findAccountFolderStateByAccountId(db, accountId);
      throw new HTTPException(409, {
        message: "Stored folder revision does not match the expected revision",
        cause: mapAccountFolderStateToSyncResponse(current),
      });
    }

    return c.json(mapAccountFolderStateToSyncResponse(accountFolderState));
  },
);

function getAccountId(c: Context<SessionAuthHonoEnv>) {
  return c.get("account").id;
}

export default routes;
