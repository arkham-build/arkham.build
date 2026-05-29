import { randomUUID } from "node:crypto";
import {
  FolderSyncRequestSchema,
  FolderSyncResponseSchema,
} from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Selectable } from "kysely";
import type { Database } from "../../db/db.ts";
import type { AccountFolder } from "../../db/schema.types.ts";
import type { HonoEnv, SessionAuthHonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { sessionAuth } from "../auth/session-auth-middleware.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", sessionAuth(), async (c) => {
  const accountFolderState = await getAccountFolderState(
    c.get("db"),
    getAccountId(c),
  );
  return c.json(serializeFolderState(accountFolderState));
});

routes.put(
  "/",
  sessionAuth(),
  zodValidator("json", FolderSyncRequestSchema),
  async (c) => {
    const db = c.get("db");
    const accountId = getAccountId(c);
    const payload = c.req.valid("json");

    const current = await getAccountFolderState(db, accountId);
    const currentRevision = current?.revision ?? null;

    if (currentRevision !== payload.expectedRevision) {
      throw new HTTPException(409, {
        message: "Stored folder revision does not match the expected revision",
        cause: serializeFolderState(current),
      });
    }

    const revision = randomUUID();

    const accountFolderState = await db
      .insertInto("account_folder")
      .values({
        account_id: accountId,
        revision,
        state: payload.state,
      })
      .onConflict((oc) =>
        oc.column("account_id").doUpdateSet({
          revision,
          state: payload.state,
        }),
      )
      .returning(["state", "revision"])
      .executeTakeFirstOrThrow();

    return c.json(serializeFolderState(accountFolderState));
  },
);

export default routes;

function getAccountId(c: Context<SessionAuthHonoEnv>) {
  return c.get("account").id;
}

async function getAccountFolderState(db: Database, accountId: string) {
  return await db
    .selectFrom("account_folder")
    .select(["state", "revision"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

function serializeFolderState(
  accountFolderState:
    | Pick<Selectable<AccountFolder>, "state" | "revision">
    | undefined,
) {
  return FolderSyncResponseSchema.parse({
    revision: accountFolderState?.revision ?? null,
    state: accountFolderState?.state ?? null,
  });
}
