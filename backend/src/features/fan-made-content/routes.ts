import { FanMadeProjectInfoSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../lib/hono-env.ts";
import {
  findFanMadeProjectInfoById,
  listFanMadeProjectInfos,
} from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/", async (c) => {
  const projects = await listFanMadeProjectInfos(c.get("db"));
  const data = projects.map((project) =>
    FanMadeProjectInfoSchema.parse(project),
  );
  return c.json({ data });
});

routes.get("/:id", async (c) => {
  const project = await findFanMadeProjectInfoById(
    c.get("db"),
    c.req.param("id"),
  );

  if (!project) {
    throw new HTTPException(404, { message: "Project not found." });
  }

  return c.json(FanMadeProjectInfoSchema.parse(project));
});

export default routes;
