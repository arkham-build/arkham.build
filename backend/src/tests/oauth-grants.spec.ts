import { randomUUID } from "node:crypto";
import { OAuthGrantListResponseSchema } from "@arkham-build/shared";
import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import {
  generateOAuthAccessToken,
  hashOAuthCredential,
} from "../lib/oauth/crypto.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

const REDIRECT_URI = "https://connected-app.example/callback";
const SCOPES = ["profile:read", "decks:read"] as const;

describe("OAuth connected-app grants", () => {
  test("lists only the account's grants with disabled status and explicit dates", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const accountId = await getTestAccountId(db);
    const firstGrantedAt = new Date("2026-07-01T10:00:00.000Z");
    const firstAuthorizedAt = new Date("2026-07-22T12:30:00.000Z");
    const active = await seedGrant(db, accountId, {
      clientName: "Active connected app",
      createdAt: firstGrantedAt,
      updatedAt: firstAuthorizedAt,
    });
    const disabled = await seedGrant(db, accountId, {
      clientName: "Disabled connected app",
      disabledAt: new Date("2026-07-23T00:00:00.000Z"),
    });
    const otherAccount = await db
      .insertInto("account")
      .values({ name: `other-${randomUUID()}` })
      .returning("id")
      .executeTakeFirstOrThrow();
    await seedGrant(db, otherAccount.id, { clientName: "Private other app" });

    const response = await app.request("/v2/account/oauth/grants", {
      headers: { Cookie: sessionCookie },
    });
    const body = OAuthGrantListResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.grants).toHaveLength(2);
    expect(body.grants).toEqual(
      expect.arrayContaining([
        {
          client: {
            id: active.clientId,
            name: "Active connected app",
            status: "active",
          },
          scopes: [...SCOPES],
          grantedAt: firstGrantedAt.toISOString(),
          lastAuthorizedAt: firstAuthorizedAt.toISOString(),
        },
        expect.objectContaining({
          client: {
            id: disabled.clientId,
            name: "Disabled connected app",
            status: "disabled",
          },
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain("secret_hash");
    expect(JSON.stringify(body)).not.toContain("token_hash");
    expect(JSON.stringify(body)).not.toContain("Private other app");
  });

  test("revokes a grant, its credentials, and claimed pending requests", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const accountId = await getTestAccountId(db);
    const seeded = await seedGrant(db, accountId, {
      clientName: "Revoked connected app",
      withCredentials: true,
      withRequests: true,
    });

    const usableResponse = await app.request("/v2/user/me", {
      headers: { Authorization: `Bearer ${seeded.accessToken}` },
    });
    expect(usableResponse.status).toBe(200);

    const response = await app.request(
      `/v2/account/oauth/grants/${seeded.clientId}`,
      {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      },
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(
      await db
        .selectFrom("oauth_grant")
        .select("id")
        .where("id", "=", seeded.grantId)
        .executeTakeFirst(),
    ).toBeUndefined();
    expect(await credentialCount(db, seeded.grantId)).toEqual({
      access: 0,
      codes: 0,
      refresh: 0,
    });

    const requests = await db
      .selectFrom("oauth_authorization_request")
      .select(["id", "account_id", "consumed_at"])
      .where("oauth_client_id", "=", seeded.clientId)
      .orderBy("id")
      .execute();
    expect(requests).toHaveLength(2);
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ account_id: null, consumed_at: null }),
        expect.objectContaining({
          account_id: accountId,
          consumed_at: expect.any(Date),
        }),
      ]),
    );

    const revokedTokenResponse = await app.request("/v2/user/me", {
      headers: { Authorization: `Bearer ${seeded.accessToken}` },
    });
    expect(revokedTokenResponse.status).toBe(401);

    const repeatedResponse = await app.request(
      `/v2/account/oauth/grants/${seeded.clientId}`,
      {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      },
    );
    expect(repeatedResponse.status).toBe(204);
  });

  test("does not revoke another account's grant", async ({ dependencies }) => {
    const { app, db, sessionCookie } = dependencies;
    const otherAccount = await db
      .insertInto("account")
      .values({ name: `other-${randomUUID()}` })
      .returning("id")
      .executeTakeFirstOrThrow();
    const seeded = await seedGrant(db, otherAccount.id, {
      clientName: "Other account app",
      withRequests: true,
    });

    const response = await app.request(
      `/v2/account/oauth/grants/${seeded.clientId}`,
      {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      },
    );

    expect(response.status).toBe(204);
    expect(
      await db
        .selectFrom("oauth_grant")
        .select("id")
        .where("id", "=", seeded.grantId)
        .executeTakeFirst(),
    ).toEqual({ id: seeded.grantId });
    expect(
      await db
        .selectFrom("oauth_authorization_request")
        .select("id")
        .where("account_id", "=", otherAccount.id)
        .where("oauth_client_id", "=", seeded.clientId)
        .executeTakeFirst(),
    ).toBeDefined();
  });
});

async function getTestAccountId(db: Database) {
  return (
    await db
      .selectFrom("account")
      .select("id")
      .where("name", "=", TEST_ACCOUNT.name)
      .executeTakeFirstOrThrow()
  ).id;
}

async function seedGrant(
  db: Database,
  accountId: string,
  options: {
    clientName: string;
    createdAt?: Date;
    disabledAt?: Date;
    updatedAt?: Date;
    withCredentials?: boolean;
    withRequests?: boolean;
  },
) {
  const client = await db
    .insertInto("oauth_client")
    .values({
      name: options.clientName,
      secret_hash: `secret-${randomUUID()}`,
      disabled_at: options.disabledAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("oauth_client_redirect_uri")
    .values({ oauth_client_id: client.id, redirect_uri: REDIRECT_URI })
    .execute();

  const grant = await db
    .insertInto("oauth_grant")
    .values({
      account_id: accountId,
      oauth_client_id: client.id,
      scopes: [...SCOPES],
      created_at: options.createdAt,
      updated_at: options.updatedAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  let accessToken = "";
  if (options.withCredentials) {
    const refresh = await db
      .insertInto("oauth_refresh_token")
      .values({
        expires_at: new Date(Date.now() + 86_400_000),
        oauth_grant_id: grant.id,
        scopes: [...SCOPES],
        token_hash: `refresh-${randomUUID()}`,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    accessToken = generateOAuthAccessToken();
    await db
      .insertInto("oauth_access_token")
      .values({
        expires_at: new Date(Date.now() + 3_600_000),
        oauth_grant_id: grant.id,
        oauth_refresh_token_id: refresh.id,
        scopes: [...SCOPES],
        token_hash: hashOAuthCredential(accessToken),
      })
      .execute();
    await db
      .insertInto("oauth_authorization_code")
      .values({
        code_hash: `code-${randomUUID()}`,
        expires_at: new Date(Date.now() + 300_000),
        oauth_grant_id: grant.id,
        redirect_uri: REDIRECT_URI,
        scopes: [...SCOPES],
      })
      .execute();
  }

  if (options.withRequests) {
    const now = new Date();
    await db
      .insertInto("oauth_authorization_request")
      .values([
        {
          account_id: accountId,
          claimed_at: now,
          expires_at: new Date(Date.now() + 300_000),
          oauth_client_id: client.id,
          redirect_uri: REDIRECT_URI,
          request_token_hash: `claimed-${randomUUID()}`,
          scopes: [...SCOPES],
          state: "claimed-pending",
        },
        {
          expires_at: new Date(Date.now() + 300_000),
          oauth_client_id: client.id,
          redirect_uri: REDIRECT_URI,
          request_token_hash: `unclaimed-${randomUUID()}`,
          scopes: [...SCOPES],
          state: "unclaimed-pending",
        },
        {
          account_id: accountId,
          claimed_at: now,
          consumed_at: now,
          decision: "denied",
          expires_at: new Date(Date.now() + 300_000),
          oauth_client_id: client.id,
          redirect_uri: REDIRECT_URI,
          request_token_hash: `consumed-${randomUUID()}`,
          scopes: [...SCOPES],
          state: "consumed",
        },
      ])
      .execute();
  }

  return { accessToken, clientId: client.id, grantId: grant.id };
}

async function credentialCount(db: Database, grantId: string) {
  const [access, codes, refresh] = await Promise.all([
    db
      .selectFrom("oauth_access_token")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("oauth_grant_id", "=", grantId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("oauth_authorization_code")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("oauth_grant_id", "=", grantId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("oauth_refresh_token")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("oauth_grant_id", "=", grantId)
      .executeTakeFirstOrThrow(),
  ]);

  return {
    access: Number(access.count),
    codes: Number(codes.count),
    refresh: Number(refresh.count),
  };
}
