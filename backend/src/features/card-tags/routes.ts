import { randomUUID } from "node:crypto";
import {
  CardTagsSyncRequestSchema,
  CardTagsSyncResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Selectable } from "kysely";
import type { AccountCardTag } from "../../db/schema.types.ts";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { upsertRevisionedAccountState } from "../../lib/revisioned-account-state.ts";
import { zodValidator } from "../../lib/validation.ts";
import { findAccountCardTagStateByAccountId } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountCardTagState = await findAccountCardTagStateByAccountId(
    c.get("db"),
    c.get("account").id,
  );
  return c.json(mapAccountCardTagStateToSyncResponse(accountCardTagState));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", CardTagsSyncRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const payload = c.req.valid("json");

    const accountCardTagState = await upsertRevisionedAccountState(db, {
      accountId,
      expectedRevision: payload.expectedRevision,
      revision: randomUUID(),
      state: payload.state,
      table: "account_card_tag",
    });

    if (!accountCardTagState) {
      const current = await findAccountCardTagStateByAccountId(db, accountId);
      throw new HTTPException(409, {
        message:
          "Stored card tag revision does not match the expected revision",
        cause: mapAccountCardTagStateToSyncResponse(current),
      });
    }

    return c.json(mapAccountCardTagStateToSyncResponse(accountCardTagState));
  },
);

function mapAccountCardTagStateToSyncResponse(
  accountCardTagState:
    | Pick<Selectable<AccountCardTag>, "state" | "revision">
    | undefined,
) {
  return CardTagsSyncResponseSchema.parse({
    revision: accountCardTagState?.revision ?? null,
    state: accountCardTagState?.state ?? null,
  });
}

export default routes;
