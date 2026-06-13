import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { NoResultError } from "kysely";
import { findAdditionalMetadata } from "../../lib/arkhamdb/additional-metadata.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/:id", async (c) => {
  try {
    return c.json(await findAdditionalMetadata(c.get("db"), c.req.param("id")));
  } catch (err) {
    if (err instanceof NoResultError) throw new HTTPException(404);
    throw err;
  }
});

export default router;
