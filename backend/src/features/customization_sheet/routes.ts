import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../lib/hono-env.ts";

const routes = new Hono<HonoEnv>();

routes.get("/:path{.+\\.webp}", async (ctx) => {
  const { path } = ctx.req.param();

  const BASE_PATH = "https://ahlcg.derwinski.pl";

  const sheet = await fetch(`${BASE_PATH}/${path}`);

  if (!sheet.ok) {
    throw new HTTPException(404, { message: "Customization sheet not found." });
  }

  return new Response(sheet.body, {
    headers: {
      "Cache-Control": "public, max-age=2592000",
      "Content-Type": "image/webp",
    },
    status: sheet.status,
    statusText: sheet.statusText,
  });
});

export default routes;
