import { FanMadeProjectInfoSchema } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { getAppDataVersions, upsertFanMadeProjectInfo } from "./queries.ts";

const routes = new Hono<HonoEnv>();

const adminKeyMiddleware = bearerAuth({
  verifyToken: (token, c: Context<HonoEnv>) =>
    token === c.get("config").ADMIN_API_KEY,
});

routes.get("/up", (c) => c.text("ok"));

routes.get("/version", async (c) => {
  const dataVersions = await getAppDataVersions(c.get("db"));
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

export default routes;
