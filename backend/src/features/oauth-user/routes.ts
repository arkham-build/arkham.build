import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { errorHandler } from "../../lib/errors.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import { oauthBearerAuth } from "./bearer-auth.ts";
import {
  createOAuthDeck,
  deleteOAuthDeck,
  getOAuthDeck,
  getOAuthDeckBatch,
  getOAuthDeckManifest,
  updateOAuthDeck,
  upgradeOAuthDeck,
} from "./deck-service.ts";
import {
  OAuthDeckBatchRequestSchema,
  OAuthDeckBatchResponseSchema,
  OAuthDeckDeleteQuerySchema,
  OAuthDeckManifestQuerySchema,
  OAuthDeckManifestResponseSchema,
  OAuthDeckSchema,
  OAuthDeckSourceSchema,
  OAuthProfileResponseSchema,
  OAuthUserErrorSchema,
  type OAuthDeckSource,
} from "./dtos.ts";

const routes = new Hono<HonoEnv>();

routes.onError((error, c) => {
  if (error instanceof HTTPException) {
    const code = deckErrorCode(error.status);
    if (code && c.req.path.startsWith("/v2/user/decks")) {
      return c.json(
        OAuthUserErrorSchema.parse({ error: code, message: error.message }),
        error.status,
      );
    }
  }

  return errorHandler(error, c);
});

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

routes.get(
  "/decks/manifest",
  oauthBearerAuth(["decks:read"]),
  zodValidator("query", OAuthDeckManifestQuerySchema),
  async (c) => {
    const { source } = c.req.valid("query");
    return c.json(
      OAuthDeckManifestResponseSchema.parse(
        await getOAuthDeckManifest(c, source),
      ),
      200,
    );
  },
);

routes.post(
  "/decks/batch",
  oauthBearerAuth(["decks:read"]),
  zodValidator("json", OAuthDeckBatchRequestSchema),
  async (c) => {
    const { decks } = c.req.valid("json");
    return c.json(
      OAuthDeckBatchResponseSchema.parse({
        decks: await getOAuthDeckBatch(c, decks),
      }),
      200,
    );
  },
);

routes.get("/decks/:source/:id", oauthBearerAuth(["decks:read"]), async (c) => {
  const source = deckSource(c.req.param("source"));
  const id = c.req.param("id");
  return c.json(OAuthDeckSchema.parse(await getOAuthDeck(c, source, id)), 200);
});

routes.post(
  "/decks/:source",
  oauthBearerAuth(["decks:write"]),
  zodValidator("json", OAuthDeckSchema),
  async (c) => {
    const source = deckSource(c.req.param("source"));
    return c.json(
      OAuthDeckSchema.parse(
        await createOAuthDeck(c, source, c.req.valid("json")),
      ),
      201,
    );
  },
);

routes.put(
  "/decks/:source/:id",
  oauthBearerAuth(["decks:write"]),
  zodValidator("json", OAuthDeckSchema),
  async (c) => {
    const source = deckSource(c.req.param("source"));
    const id = c.req.param("id");
    return c.json(
      OAuthDeckSchema.parse(
        await updateOAuthDeck(c, source, id, c.req.valid("json")),
      ),
      200,
    );
  },
);

routes.delete(
  "/decks/:source/:id",
  oauthBearerAuth(["decks:delete"]),
  zodValidator("query", OAuthDeckDeleteQuerySchema),
  async (c) => {
    const source = deckSource(c.req.param("source"));
    const id = c.req.param("id");
    await deleteOAuthDeck(c, source, id, c.req.valid("query").all === "true");
    return c.body(null, 204);
  },
);

routes.post(
  "/decks/:source/:id/upgrade",
  oauthBearerAuth(["decks:write"]),
  zodValidator("json", OAuthDeckSchema),
  async (c) => {
    const source = deckSource(c.req.param("source"));
    const id = c.req.param("id");
    return c.json(
      OAuthDeckSchema.parse(
        await upgradeOAuthDeck(c, source, id, c.req.valid("json")),
      ),
      201,
    );
  },
);

function deckSource(value: string): OAuthDeckSource {
  const result = OAuthDeckSourceSchema.safeParse(value);
  if (!result.success) throw invalidDeckRoute();
  return result.data;
}

function deckErrorCode(status: number) {
  switch (status) {
    case 400:
      return "invalid_request" as const;
    case 404:
      return "not_found" as const;
    case 409:
      return "conflict" as const;
    case 503:
      return "upstream_unavailable" as const;
    default:
      return undefined;
  }
}

function invalidDeckRoute() {
  return new HTTPException(400, {
    message: "Deck source or identifier is invalid",
  });
}

export default routes;
