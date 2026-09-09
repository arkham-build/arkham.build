import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { adminKeyMiddleware } from "../admin-key.ts";
import {
  generateOAuthClientId,
  generateOAuthClientSecret,
  hashOAuthClientSecret,
} from "../../../lib/oauth/crypto.ts";
import {
  createOAuthClient,
  findOAuthClientById,
  listOAuthClients,
  type OAuthClientDetails,
  rotateOAuthClientSecret,
  setOAuthClientDisabled,
  updateOAuthClient,
} from "./queries.ts";
import { isValidOAuthRedirectUri } from "./redirect-uri.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { zodValidator } from "../../../lib/validation.ts";

const routes = new Hono<HonoEnv>();
routes.use("*", adminKeyMiddleware);

const ClientNameSchema = z.string().trim().min(1).max(128);

const RedirectUrisSchema = z
  .array(
    z.string().refine(isValidOAuthRedirectUri, "Invalid OAuth redirect URI"),
  )
  .min(1)
  .superRefine((redirectUris, context) => {
    if (new Set(redirectUris).size !== redirectUris.length) {
      context.addIssue({
        code: "custom",
        message: "OAuth redirect URIs must be unique",
      });
    }
  });

const CreateClientRequestSchema = z
  .object({
    name: ClientNameSchema,
    redirectUris: RedirectUrisSchema,
  })
  .strict();

export const ClientResponseSchema = z
  .object({
    clientId: z.uuid(),
    name: z.string(),
    redirectUris: z.array(z.string()),
    disabledAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const CreatedClientResponseSchema = ClientResponseSchema.extend({
  clientSecret: z.string().startsWith("ab_cs_"),
}).strict();

routes.post(
  "/clients",
  zodValidator("json", CreateClientRequestSchema),
  async (c) => {
    const input = c.req.valid("json");
    const clientId = generateOAuthClientId();
    const clientSecret = generateOAuthClientSecret();
    const secretHash = await hashOAuthClientSecret(clientSecret);
    const client = await createOAuthClient(c.get("db"), {
      id: clientId,
      name: input.name,
      redirectUris: input.redirectUris,
      secretHash,
    });

    c.header("Cache-Control", "no-store");
    c.header("Pragma", "no-cache");

    return c.json(formatClient(client, clientSecret), 201);
  },
);

routes.get("/clients", async (c) => {
  const clients = await listOAuthClients(c.get("db"));
  return c.json(clients.map((c) => formatClient(c)));
});

routes.get("/clients/:clientId", async (c) => {
  const client = await findOAuthClientById(c.get("db"), clientId(c));
  if (!client) throw clientNotFound();
  return c.json(formatClient(client));
});

const UpdateClientRequestSchema = z
  .object({
    name: ClientNameSchema.optional(),
    redirectUris: RedirectUrisSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.name !== undefined || value.redirectUris !== undefined,
    "At least one client field must be provided",
  );

routes.patch(
  "/clients/:clientId",
  zodValidator("json", UpdateClientRequestSchema),
  async (c) => {
    const client = await updateOAuthClient(
      c.get("db"),
      clientId(c),
      c.req.valid("json"),
    );
    if (!client) throw clientNotFound();

    return c.json(formatClient(client));
  },
);

routes.post("/clients/:clientId/disable", async (c) => {
  const client = await setDisabledOrThrow(c, true);
  return c.json(formatClient(client));
});

routes.post("/clients/:clientId/enable", async (c) => {
  const client = await setDisabledOrThrow(c, false);
  return c.json(formatClient(client));
});

routes.post("/clients/:clientId/secret/rotate", async (c) => {
  const clientSecret = generateOAuthClientSecret();
  const secretHash = await hashOAuthClientSecret(clientSecret);
  const client = await rotateOAuthClientSecret(
    c.get("db"),
    clientId(c),
    secretHash,
  );
  if (!client) throw clientNotFound();

  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");

  return c.json(formatClient(client, clientSecret));
});

async function setDisabledOrThrow(c: Context<HonoEnv>, disabled: boolean) {
  const client = await setOAuthClientDisabled(
    c.get("db"),
    clientId(c),
    disabled,
  );
  if (!client) throw clientNotFound();

  return client;
}

function clientId(c: { req: { param(name: string): string } }) {
  const result = z.uuid().safeParse(c.req.param("clientId"));
  if (!result.success) {
    throw new HTTPException(400, { message: "Invalid OAuth client ID" });
  }

  return result.data;
}

function clientNotFound() {
  return new HTTPException(404, { message: "OAuth client not found" });
}

function formatClient(client: OAuthClientDetails, clientSecret?: string) {
  const dto = clientSecret ? CreatedClientResponseSchema : ClientResponseSchema;

  const payload: Record<string, unknown> = {
    clientId: client.id,
    name: client.name,
    redirectUris: client.redirect_uris,
    disabledAt: client.disabled_at?.toISOString() ?? null,
    createdAt: client.created_at.toISOString(),
    updatedAt: client.updated_at.toISOString(),
  };
  if (clientSecret) payload["clientSecret"] = clientSecret;

  return dto.parse(payload);
}

export default routes;
