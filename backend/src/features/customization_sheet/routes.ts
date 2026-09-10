import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { publicCacheControlHeader } from "../../lib/cache-headers.ts";
import {
  FetchTimeoutError,
  fetchWithTimeout,
} from "../../lib/fetch-with-timeout.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";

const routes = new Hono<HonoEnv>();

routes.get("/:path{.+\\.webp}", async (ctx) => {
  const { path } = ctx.req.param();

  const BASE_PATH = "https://ahlcg.derwinski.pl";

  let sheet: Response;

  try {
    sheet = await fetchWithTimeout(`${BASE_PATH}/${path}`);
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      throw new HTTPException(500, {
        message: "Customization sheet request timed out.",
      });
    }

    throw error;
  }

  if (!sheet.ok) {
    throw new HTTPException(404, { message: "Customization sheet not found." });
  }

  return new Response(sheet.body, {
    headers: {
      "Cache-Control": publicCacheControlHeader(2592000),
      "Content-Type": "image/webp",
    },
    status: sheet.status,
    statusText: sheet.statusText,
  });
});

export default routes;
