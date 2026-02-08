import { FanMadeProjectInfoSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { getAllFanMadeProjectInfos, getFanMadeProjectInfo } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", async (c) => {
  const projects = await getAllFanMadeProjectInfos(c.get("db"));
  const data = projects.map((p) => FanMadeProjectInfoSchema.parse(p));
  return c.json({ data });
});

routes.get("/:id", async (ctx) => {
  const project = await getFanMadeProjectInfo(
    ctx.get("db"),
    ctx.req.param("id"),
  );

  if (!project) {
    throw new HTTPException(404, { message: "Project not found." });
  }

  return ctx.json(FanMadeProjectInfoSchema.parse(project));
});

export default routes;
