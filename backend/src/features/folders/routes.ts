import { randomUUID } from "node:crypto";
import {
  FolderSyncRequestSchema,
  FolderSyncResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Selectable } from "kysely";
import type { AccountFolder } from "../../db/schema.types.ts";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { upsertRevisionedAccountState } from "../../lib/revisioned-account-state.ts";
import { zodValidator } from "../../lib/validation.ts";
import { findAccountFolderStateByAccountId } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountFolderState = await findAccountFolderStateByAccountId(
    c.get("db"),
    c.get("account").id,
  );
  return c.json(mapAccountFolderStateToSyncResponse(accountFolderState));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", FolderSyncRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const payload = c.req.valid("json");

    const accountFolderState = await upsertRevisionedAccountState(db, {
      accountId,
      expectedRevision: payload.expectedRevision,
      revision: randomUUID(),
      state: payload.state,
      table: "account_folder",
    });

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

function mapAccountFolderStateToSyncResponse(
  accountFolderState:
    | Pick<Selectable<AccountFolder>, "state" | "revision">
    | undefined,
) {
  return FolderSyncResponseSchema.parse({
    revision: accountFolderState?.revision ?? null,
    state: accountFolderState?.state ?? null,
  });
}

export default routes;
