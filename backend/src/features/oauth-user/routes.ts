import { Hono } from "hono";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { OAuthProfileResponseSchema } from "./dtos.ts";
import { oauthBearerAuth } from "./bearer-auth.ts";

const routes = new Hono<HonoEnv>();

routes.get("/me", oauthBearerAuth(["profile:read"]), (c) => {
  const { account } = c.get("oauthBearer");
  return c.json(
    OAuthProfileResponseSchema.parse({
      id: account.id,
      username: account.name,
    }),
    200,
  );
});

export default routes;
