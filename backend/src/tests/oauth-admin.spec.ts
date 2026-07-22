import { randomUUID } from "node:crypto";
import { describe, expect } from "vitest";
import { z } from "zod";
import type { appFactory } from "../app.ts";
import type { Database } from "../db/db.ts";
import {
  ClientResponseSchema,
  CreatedClientResponseSchema,
} from "../features/admin/oauth-clients/routes.ts";
import { verifyOAuthClientSecret } from "../lib/oauth/crypto.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

type App = ReturnType<typeof appFactory>;
type CreateClientInput = {
  name?: string;
  redirectUris?: string[];
};

const DEFAULT_REDIRECT_URI = "https://example.com/oauth/callback";

describe("OAuth client admin routes", () => {
  test("requires the admin API key", async ({ dependencies }) => {
    const response = await dependencies.app.request("/admin/oauth/clients", {
      method: "GET",
    });

    expect(response.status).toBe(401);
  });

  test("creates a client with a server-generated ID and one-time secret", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const redirectUris = [
      "HTTPS://Example.com/oauth/callback?source=admin",
      "http://localhost:3000/oauth/callback",
      "com.example.app:/oauth/callback",
    ];
    const { body, response } = await createClient(app, config.ADMIN_API_KEY, {
      name: "Example application",
      redirectUris,
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(body).toMatchObject({
      name: "Example application",
      redirectUris: [...redirectUris].sort(),
      disabledAt: null,
    });

    const client = await db
      .selectFrom("oauth_client")
      .selectAll()
      .where("id", "=", body.clientId)
      .executeTakeFirstOrThrow();
    const storedRedirectUris = await db
      .selectFrom("oauth_client_redirect_uri")
      .select("redirect_uri")
      .where("oauth_client_id", "=", body.clientId)
      .orderBy("redirect_uri")
      .execute();

    expect(client.secret_hash).not.toBe(body.clientSecret);
    expect(client.secret_hash).not.toContain(body.clientSecret);
    expect(
      await verifyOAuthClientSecret(body.clientSecret, client.secret_hash),
    ).toBe(true);
    expect(
      await verifyOAuthClientSecret("wrong secret", client.secret_hash),
    ).toBe(false);
    expect(await verifyOAuthClientSecret(body.clientSecret, "malformed")).toBe(
      false,
    );
    expect(storedRedirectUris.map((row) => row.redirect_uri)).toEqual(
      [...redirectUris].sort(),
    );
  });

  test("rejects invalid redirect URIs and requires at least one", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const invalidRedirectUris = [
      "/oauth/callback",
      " https://example.com/oauth/callback",
      "https:example.com/oauth/callback",
      "https://user:password@example.com/oauth/callback",
      "https://example.com/oauth/callback#fragment",
      "https://example.com/oauth/callback#",
      "http://example.com/oauth/callback",
      "http://192.168.1.2/oauth/callback",
      "http://127.0.0.2:49152/oauth/callback",
      "http://[::1]:49152/oauth/callback",
      "javascript:alert(1)",
      "data:text/plain,callback",
      "file:///tmp/callback",
      "vbscript:callback",
      "about:blank",
      "blob:https://example.com/callback",
    ];

    for (const redirectUri of invalidRedirectUris) {
      const response = await app.request("/admin/oauth/clients", {
        method: "POST",
        headers: adminJsonHeaders(config.ADMIN_API_KEY),
        body: JSON.stringify({
          name: "Invalid callback client",
          redirectUris: [redirectUri],
        }),
      });

      expect(response.status).toBe(400);
    }

    for (const redirectUris of [
      [],
      [DEFAULT_REDIRECT_URI, DEFAULT_REDIRECT_URI],
    ]) {
      const response = await app.request("/admin/oauth/clients", {
        method: "POST",
        headers: adminJsonHeaders(config.ADMIN_API_KEY),
        body: JSON.stringify({
          name: "Invalid callback set",
          redirectUris,
        }),
      });

      expect(response.status).toBe(400);
    }

    const clients = await db.selectFrom("oauth_client").select("id").execute();
    expect(clients).toEqual([]);
  });

  test("lists, gets, and updates clients without exposing secrets", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const { body: created } = await createClient(app, config.ADMIN_API_KEY);
    const stored = await db
      .selectFrom("oauth_client")
      .select("secret_hash")
      .where("id", "=", created.clientId)
      .executeTakeFirstOrThrow();

    const listResponse = await app.request("/admin/oauth/clients", {
      headers: adminHeaders(config.ADMIN_API_KEY),
    });
    const listText = await listResponse.text();
    const listedClients = z
      .array(ClientResponseSchema)
      .parse(JSON.parse(listText));

    expect(listResponse.status).toBe(200);
    expect(listedClients).toHaveLength(1);
    expect(listedClients[0]).toMatchObject({
      clientId: created.clientId,
      name: created.name,
      redirectUris: created.redirectUris,
    });
    assertSecretAbsent(listText, created.clientSecret, stored.secret_hash);

    const getResponse = await app.request(
      `/admin/oauth/clients/${created.clientId}`,
      { headers: adminHeaders(config.ADMIN_API_KEY) },
    );
    const getText = await getResponse.text();
    expect(getResponse.status).toBe(200);
    expect(ClientResponseSchema.parse(JSON.parse(getText))).toMatchObject({
      clientId: created.clientId,
      name: created.name,
    });
    assertSecretAbsent(getText, created.clientSecret, stored.secret_hash);

    const updateResponse = await app.request(
      `/admin/oauth/clients/${created.clientId}`,
      {
        method: "PATCH",
        headers: adminJsonHeaders(config.ADMIN_API_KEY),
        body: JSON.stringify({ name: "Renamed application" }),
      },
    );
    const updateText = await updateResponse.text();
    const updated = ClientResponseSchema.parse(JSON.parse(updateText));

    expect(updateResponse.status).toBe(200);
    expect(updated).toMatchObject({
      name: "Renamed application",
      redirectUris: created.redirectUris,
    });
    assertSecretAbsent(updateText, created.clientSecret, stored.secret_hash);
  });

  test("transactionally replaces redirects and invalidates removed URI work", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const removedRedirectUri = "https://old.example.com/oauth/callback";
    const keptRedirectUri = "https://example.com/oauth/callback";
    const addedRedirectUri = "com.example.app:/oauth/callback";
    const { body: created } = await createClient(app, config.ADMIN_API_KEY, {
      redirectUris: [removedRedirectUri, keptRedirectUri],
    });
    const grantId = await seedGrant(db, created.clientId);
    const removedRequestId = await seedAuthorizationRequest(
      db,
      created.clientId,
      removedRedirectUri,
    );
    const keptRequestId = await seedAuthorizationRequest(
      db,
      created.clientId,
      keptRedirectUri,
    );
    const removedCodeId = await seedAuthorizationCode(
      db,
      grantId,
      removedRedirectUri,
    );
    const keptCodeId = await seedAuthorizationCode(
      db,
      grantId,
      keptRedirectUri,
    );

    const response = await app.request(
      `/admin/oauth/clients/${created.clientId}`,
      {
        method: "PATCH",
        headers: adminJsonHeaders(config.ADMIN_API_KEY),
        body: JSON.stringify({
          redirectUris: [keptRedirectUri, addedRedirectUri],
        }),
      },
    );
    const updated = ClientResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(updated.redirectUris).toEqual(
      [keptRedirectUri, addedRedirectUri].sort(),
    );

    const requests = await db
      .selectFrom("oauth_authorization_request")
      .select(["id", "consumed_at"])
      .where("id", "in", [removedRequestId, keptRequestId])
      .orderBy("id")
      .execute();
    const codes = await db
      .selectFrom("oauth_authorization_code")
      .select(["id", "revoked_at"])
      .where("id", "in", [removedCodeId, keptCodeId])
      .orderBy("id")
      .execute();
    const requestById = new Map(requests.map((row) => [row.id, row]));
    const codeById = new Map(codes.map((row) => [row.id, row]));

    expect(requestById.get(removedRequestId)?.consumed_at).not.toBeNull();
    expect(requestById.get(keptRequestId)?.consumed_at).toBeNull();
    expect(codeById.get(removedCodeId)?.revoked_at).not.toBeNull();
    expect(codeById.get(keptCodeId)?.revoked_at).toBeNull();
  });

  test("disables and enables clients idempotently", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const { body: created } = await createClient(app, config.ADMIN_API_KEY);
    const grantId = await seedGrant(db, created.clientId);
    const { accessTokenId, refreshTokenId } = await seedTokens(db, grantId);

    const firstDisable = await postClientAction(
      app,
      config.ADMIN_API_KEY,
      created.clientId,
      "disable",
    );
    const secondDisable = await postClientAction(
      app,
      config.ADMIN_API_KEY,
      created.clientId,
      "disable",
    );

    expect(firstDisable.disabledAt).not.toBeNull();
    expect(secondDisable).toEqual(firstDisable);

    const firstEnable = await postClientAction(
      app,
      config.ADMIN_API_KEY,
      created.clientId,
      "enable",
    );
    const secondEnable = await postClientAction(
      app,
      config.ADMIN_API_KEY,
      created.clientId,
      "enable",
    );

    expect(firstEnable.disabledAt).toBeNull();
    expect(secondEnable).toEqual(firstEnable);

    const client = await db
      .selectFrom("oauth_client")
      .select("disabled_at")
      .where("id", "=", created.clientId)
      .executeTakeFirstOrThrow();
    const refreshToken = await db
      .selectFrom("oauth_refresh_token")
      .select("revoked_at")
      .where("id", "=", refreshTokenId)
      .executeTakeFirstOrThrow();
    const accessToken = await db
      .selectFrom("oauth_access_token")
      .select("revoked_at")
      .where("id", "=", accessTokenId)
      .executeTakeFirstOrThrow();

    expect(client.disabled_at).toBeNull();
    expect(refreshToken.revoked_at).toBeNull();
    expect(accessToken.revoked_at).toBeNull();
  });

  test("rotates the secret and invalidates dependent credentials but retains grants", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const { body: created } = await createClient(app, config.ADMIN_API_KEY);
    const grantId = await seedGrant(db, created.clientId);
    const requestId = await seedAuthorizationRequest(
      db,
      created.clientId,
      DEFAULT_REDIRECT_URI,
    );
    const codeId = await seedAuthorizationCode(
      db,
      grantId,
      DEFAULT_REDIRECT_URI,
    );
    const { accessTokenId, refreshTokenId } = await seedTokens(db, grantId);

    const response = await app.request(
      `/admin/oauth/clients/${created.clientId}/secret/rotate`,
      {
        method: "POST",
        headers: adminHeaders(config.ADMIN_API_KEY),
      },
    );
    const rotated = CreatedClientResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(rotated.clientSecret).not.toBe(created.clientSecret);

    const client = await db
      .selectFrom("oauth_client")
      .select("secret_hash")
      .where("id", "=", created.clientId)
      .executeTakeFirstOrThrow();
    const request = await db
      .selectFrom("oauth_authorization_request")
      .select("consumed_at")
      .where("id", "=", requestId)
      .executeTakeFirstOrThrow();
    const code = await db
      .selectFrom("oauth_authorization_code")
      .select("revoked_at")
      .where("id", "=", codeId)
      .executeTakeFirstOrThrow();
    const refreshToken = await db
      .selectFrom("oauth_refresh_token")
      .select("revoked_at")
      .where("id", "=", refreshTokenId)
      .executeTakeFirstOrThrow();
    const accessToken = await db
      .selectFrom("oauth_access_token")
      .select("revoked_at")
      .where("id", "=", accessTokenId)
      .executeTakeFirstOrThrow();
    const grant = await db
      .selectFrom("oauth_grant")
      .select("id")
      .where("id", "=", grantId)
      .executeTakeFirst();

    expect(
      await verifyOAuthClientSecret(rotated.clientSecret, client.secret_hash),
    ).toBe(true);
    expect(
      await verifyOAuthClientSecret(created.clientSecret, client.secret_hash),
    ).toBe(false);
    expect(request.consumed_at).not.toBeNull();
    expect(code.revoked_at).not.toBeNull();
    expect(refreshToken.revoked_at).not.toBeNull();
    expect(accessToken.revoked_at).not.toBeNull();
    expect(grant).toEqual({ id: grantId });
  });

  test("does not leak secrets or hashes through errors or responses", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const { body: created } = await createClient(app, config.ADMIN_API_KEY);
    const originalStored = await db
      .selectFrom("oauth_client")
      .select("secret_hash")
      .where("id", "=", created.clientId)
      .executeTakeFirstOrThrow();
    const rotationResponse = await app.request(
      `/admin/oauth/clients/${created.clientId}/secret/rotate`,
      {
        method: "POST",
        headers: adminHeaders(config.ADMIN_API_KEY),
      },
    );
    const rotated = CreatedClientResponseSchema.parse(
      await rotationResponse.json(),
    );
    const rotatedStored = await db
      .selectFrom("oauth_client")
      .select("secret_hash")
      .where("id", "=", created.clientId)
      .executeTakeFirstOrThrow();

    const errorResponse = await app.request("/admin/oauth/clients", {
      method: "POST",
      headers: adminJsonHeaders(config.ADMIN_API_KEY),
      body: JSON.stringify({
        name: "Unexpected secret input",
        redirectUris: [DEFAULT_REDIRECT_URI],
        clientSecret: created.clientSecret,
      }),
    });
    const errorText = await errorResponse.text();
    const listResponse = await app.request("/admin/oauth/clients", {
      headers: adminHeaders(config.ADMIN_API_KEY),
    });
    const listText = await listResponse.text();

    expect(errorResponse.status).toBe(400);
    assertSecretAbsent(
      errorText,
      created.clientSecret,
      originalStored.secret_hash,
    );
    assertSecretAbsent(
      listText,
      rotated.clientSecret,
      rotatedStored.secret_hash,
    );
  });

  test("returns stable client ID errors", async ({ dependencies }) => {
    const { app, config } = dependencies;

    const invalidResponse = await app.request(
      "/admin/oauth/clients/not-a-uuid",
      { headers: adminHeaders(config.ADMIN_API_KEY) },
    );
    const missingResponse = await app.request(
      `/admin/oauth/clients/${randomUUID()}`,
      { headers: adminHeaders(config.ADMIN_API_KEY) },
    );

    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toMatchObject({
      message: "Invalid OAuth client ID",
    });
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toMatchObject({
      message: "OAuth client not found",
    });
  });
});

async function createClient(
  app: App,
  adminApiKey: string,
  input: CreateClientInput = {},
) {
  const response = await app.request("/admin/oauth/clients", {
    method: "POST",
    headers: adminJsonHeaders(adminApiKey),
    body: JSON.stringify({
      name: input.name ?? "Example application",
      redirectUris: input.redirectUris ?? [DEFAULT_REDIRECT_URI],
    }),
  });
  const body = CreatedClientResponseSchema.parse(await response.json());

  return { body, response };
}

async function postClientAction(
  app: App,
  adminApiKey: string,
  clientId: string,
  action: "disable" | "enable",
) {
  const response = await app.request(
    `/admin/oauth/clients/${clientId}/${action}`,
    { method: "POST", headers: adminHeaders(adminApiKey) },
  );

  expect(response.status).toBe(200);
  return ClientResponseSchema.parse(await response.json());
}

async function seedGrant(db: Database, clientId: string) {
  const account = await db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();
  const grant = await db
    .insertInto("oauth_grant")
    .values({
      account_id: account.id,
      oauth_client_id: clientId,
      scopes: ["profile:read"],
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return grant.id;
}

async function seedAuthorizationRequest(
  db: Database,
  clientId: string,
  redirectUri: string,
) {
  const request = await db
    .insertInto("oauth_authorization_request")
    .values({
      expires_at: futureDate(),
      oauth_client_id: clientId,
      redirect_uri: redirectUri,
      request_token_hash: randomUUID(),
      scopes: ["profile:read"],
      state: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return request.id;
}

async function seedAuthorizationCode(
  db: Database,
  grantId: string,
  redirectUri: string,
) {
  const code = await db
    .insertInto("oauth_authorization_code")
    .values({
      code_hash: randomUUID(),
      expires_at: futureDate(),
      oauth_grant_id: grantId,
      redirect_uri: redirectUri,
      scopes: ["profile:read"],
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return code.id;
}

async function seedTokens(db: Database, grantId: string) {
  const refreshToken = await db
    .insertInto("oauth_refresh_token")
    .values({
      expires_at: futureDate(),
      oauth_grant_id: grantId,
      scopes: ["profile:read"],
      token_hash: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const accessToken = await db
    .insertInto("oauth_access_token")
    .values({
      expires_at: futureDate(),
      oauth_grant_id: grantId,
      oauth_refresh_token_id: refreshToken.id,
      scopes: ["profile:read"],
      token_hash: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return {
    accessTokenId: accessToken.id,
    refreshTokenId: refreshToken.id,
  };
}

function futureDate() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

function adminHeaders(adminApiKey: string) {
  return { Authorization: `Bearer ${adminApiKey}` };
}

function adminJsonHeaders(adminApiKey: string) {
  return {
    ...adminHeaders(adminApiKey),
    "Content-Type": "application/json",
  };
}

function assertSecretAbsent(
  serializedValue: string,
  rawSecret: string,
  secretHash: string,
) {
  expect(serializedValue).not.toContain(rawSecret);
  expect(serializedValue).not.toContain(secretHash);
  expect(serializedValue).not.toContain("secret_hash");
}
