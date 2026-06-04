import { randomUUID } from "node:crypto";
import { FolderSyncRequestSchema } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv, SessionAuthHonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/lib/session-auth-middleware.ts";
import { mapAccountFolderStateToSyncResponse } from "./mapping.ts";
import {
  findAccountFolderStateByAccountId,
  upsertAccountFolderState,
} from "./queries.ts";

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

    const current = await findAccountFolderStateByAccountId(db, accountId);
    const currentRevision = current?.revision ?? null;

    if (currentRevision !== payload.expectedRevision) {
      throw new HTTPException(409, {
        message: "Stored folder revision does not match the expected revision",
        cause: mapAccountFolderStateToSyncResponse(current),
      });
    }

    const revision = randomUUID();
    const accountFolderState = await upsertAccountFolderState(
      db,
      accountId,
      revision,
      payload.state,
    );

    return c.json(mapAccountFolderStateToSyncResponse(accountFolderState));
  },
);

function getAccountId(c: Context<SessionAuthHonoEnv>) {
  return c.get("account").id;
}

export default routes;
