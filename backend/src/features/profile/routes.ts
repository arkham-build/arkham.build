import { UpdateProfileRequestSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  findAccountByUsername,
  updateAccountUsername,
} from "../../lib/auth/accounts.ts";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";

const routes = new Hono<HonoEnv>();

routes.patch(
  "/",
  sessionAuth(),
  zodValidator("json", UpdateProfileRequestSchema),
  async (c) => {
    const db = c.get("db");
    const account = c.get("account");
    const { username } = c.req.valid("json");

    await db.transaction().execute(async (tx) => {
      const existingAccount = await findAccountByUsername(tx, username);

      if (existingAccount && existingAccount.id !== account.id) {
        throw new HTTPException(400, {
          message: "Username is already taken",
        });
      }

      await updateAccountUsername(tx, account.id, username);
    });

    return new Response(null, { status: 200 });
  },
);

export default routes;
