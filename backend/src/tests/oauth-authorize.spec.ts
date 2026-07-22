import { createHash, randomUUID } from "node:crypto";
import { describe, expect, vi } from "vitest";
import type { appFactory } from "../app.ts";
import type { Database } from "../db/db.ts";
import { OAUTH_AUTHORIZATION_REQUEST_LIFETIME_MS } from "../features/oauth/authorization.ts";
import { OAuthErrorResponseSchema } from "../features/oauth/errors.ts";
import { resolveOAuthScopes } from "../features/oauth/scopes.ts";
import { test } from "./test-utils.ts";

const WEB_REDIRECT_URI = "https://example.com/oauth/callback";
const NATIVE_REDIRECT_URI = "com.example.app:/oauth/callback?existing=1";

describe("GET /v2/oauth/authorize", () => {
  test("stores a hashed request for 15 minutes and redirects to consent", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const now = new Date("2026-07-21T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const clientId = await seedOAuthClient(db, [WEB_REDIRECT_URI]);

    const response = await requestAuthorization(app, {
      clientId,
      redirectUri: WEB_REDIRECT_URI,
      responseType: "code",
      scope: "decks:delete profile:read decks:read decks:delete",
      state: "consent-state",
    });

    expect(response.status).toBe(302);
    const consentUrl = responseLocation(response);
    expect(consentUrl.origin).toBe(new URL(config.FRONTEND_URL).origin);
    expect(consentUrl.pathname).toBe("/oauth/consent");

    const requestToken = consentUrl.searchParams.get("request");
    expect(requestToken).toMatch(/^ab_ar_[A-Za-z0-9_-]{43}$/);
    if (!requestToken) throw new Error("Consent request token is missing");

    const storedRequest = await db
      .selectFrom("oauth_authorization_request")
      .select([
        "oauth_client_id",
        "request_token_hash",
        "redirect_uri",
        "scopes",
        "state",
        "expires_at",
      ])
      .executeTakeFirstOrThrow();

    expect(storedRequest).toEqual({
      oauth_client_id: clientId,
      request_token_hash: hashAuthorizationRequestToken(requestToken),
      redirect_uri: WEB_REDIRECT_URI,
      scopes: ["profile:read", "decks:read", "decks:write", "decks:delete"],
      state: "consent-state",
      expires_at: new Date(
        now.getTime() + OAUTH_AUTHORIZATION_REQUEST_LIFETIME_MS,
      ),
    });
    expect(JSON.stringify(storedRequest)).not.toContain(requestToken);
  });

  test("expands, deduplicates, and canonically orders scopes", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const clientId = await seedOAuthClient(db, [WEB_REDIRECT_URI]);

    const firstResponse = await requestAuthorization(app, {
      clientId,
      redirectUri: WEB_REDIRECT_URI,
      responseType: "code",
      scope: "decks:write profile:read decks:write",
      state: "scope-write",
    });
    const secondResponse = await requestAuthorization(app, {
      clientId,
      redirectUri: WEB_REDIRECT_URI,
      responseType: "code",
      scope: "profile:read decks:delete",
      state: "scope-delete",
    });

    expect(firstResponse.status).toBe(302);
    expect(secondResponse.status).toBe(302);

    const requests = await db
      .selectFrom("oauth_authorization_request")
      .select(["scopes", "state"])
      .orderBy("state")
      .execute();
    expect(requests).toEqual([
      {
        scopes: ["profile:read", "decks:read", "decks:write", "decks:delete"],
        state: "scope-delete",
      },
      {
        scopes: ["profile:read", "decks:read", "decks:write"],
        state: "scope-write",
      },
    ]);
    expect(
      resolveOAuthScopes("decks:delete profile:read decks:delete"),
    ).toMatchObject({
      success: true,
      canonicalScopes: "profile:read decks:read decks:write decks:delete",
    });
  });

  test("redirects scope errors only after trusting the callback", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const redirectUri = `${WEB_REDIRECT_URI}?existing=kept`;
    const clientId = await seedOAuthClient(db, [redirectUri]);

    for (const scope of ["profile:read unknown:scope", "decks:read"]) {
      const response = await requestAuthorization(app, {
        clientId,
        redirectUri,
        responseType: "code",
        scope,
        state: "scope-error-state",
      });
      const callbackUrl = responseLocation(response);

      expect(response.status).toBe(302);
      expect(callbackUrl.searchParams.get("existing")).toBe("kept");
      expect(callbackUrl.searchParams.get("error")).toBe("invalid_scope");
      expect(callbackUrl.searchParams.get("state")).toBe("scope-error-state");
      expect(callbackUrl.searchParams.get("error_description")).not.toContain(
        scope,
      );
    }

    expect(
      await db.selectFrom("oauth_authorization_request").select("id").execute(),
    ).toEqual([]);
  });

  test("returns direct errors for untrusted clients and callbacks", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const activeClientId = await seedOAuthClient(db, [WEB_REDIRECT_URI]);
    const disabledClientId = await seedOAuthClient(db, [WEB_REDIRECT_URI], {
      disabledAt: new Date(),
    });
    const cases = [
      {
        clientId: "not-a-uuid",
        redirectUri: WEB_REDIRECT_URI,
        expectedError: "invalid_request",
      },
      {
        clientId: randomUUID(),
        redirectUri: WEB_REDIRECT_URI,
        expectedError: "invalid_request",
      },
      {
        clientId: disabledClientId,
        redirectUri: WEB_REDIRECT_URI,
        expectedError: "unauthorized_client",
      },
      {
        clientId: activeClientId,
        redirectUri: "https://attacker.example/oauth/callback",
        expectedError: "invalid_request",
      },
    ];

    for (const testCase of cases) {
      const response = await requestAuthorization(app, {
        clientId: testCase.clientId,
        redirectUri: testCase.redirectUri,
        responseType: "code",
        scope: "profile:read",
        state: "direct-error-state",
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("Location")).toBeNull();
      expect(
        OAuthErrorResponseSchema.parse(await response.json()),
      ).toMatchObject({ error: testCase.expectedError });
    }
  });

  test("requires exact redirect URI matching without normalization", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const registeredRedirectUri =
      "https://Example.com/oauth/callback?source=exact";
    const clientId = await seedOAuthClient(db, [registeredRedirectUri]);

    const mismatchResponse = await requestAuthorization(app, {
      clientId,
      redirectUri: "https://example.com/oauth/callback?source=exact",
      responseType: "code",
      scope: "profile:read",
      state: "exact-state",
    });
    const exactResponse = await requestAuthorization(app, {
      clientId,
      redirectUri: registeredRedirectUri,
      responseType: "code",
      scope: "profile:read",
      state: "exact-state",
    });

    expect(mismatchResponse.status).toBe(400);
    expect(mismatchResponse.headers.get("Location")).toBeNull();
    expect(exactResponse.status).toBe(302);
    expect(responseLocation(exactResponse).pathname).toBe("/oauth/consent");
  });

  test("safely redirects response type and state errors", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const redirectUri = `${WEB_REDIRECT_URI}?existing=kept&state=stale`;
    const clientId = await seedOAuthClient(db, [redirectUri]);

    const responseTypeError = await requestAuthorization(app, {
      clientId,
      redirectUri,
      responseType: "token",
      scope: "profile:read",
      state: "fresh-state",
    });
    const responseTypeCallback = responseLocation(responseTypeError);
    expect(responseTypeCallback.searchParams.get("existing")).toBe("kept");
    expect(responseTypeCallback.searchParams.get("error")).toBe(
      "unsupported_response_type",
    );
    expect(responseTypeCallback.searchParams.get("state")).toBe("fresh-state");

    for (const state of ["", "é".repeat(513)]) {
      const stateError = await requestAuthorization(app, {
        clientId,
        redirectUri,
        responseType: "code",
        scope: "profile:read",
        state,
      });
      const stateCallback = responseLocation(stateError);

      expect(stateError.status).toBe(302);
      expect(stateCallback.searchParams.get("existing")).toBe("kept");
      expect(stateCallback.searchParams.get("error")).toBe("invalid_request");
      expect(stateCallback.searchParams.get("state")).toBeNull();
      if (state.length > 0) {
        expect(stateCallback.toString()).not.toContain(state);
      }
    }
  });

  test("constructs native custom-scheme error callbacks with existing queries", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const clientId = await seedOAuthClient(db, [NATIVE_REDIRECT_URI]);

    const response = await requestAuthorization(app, {
      clientId,
      redirectUri: NATIVE_REDIRECT_URI,
      responseType: "code",
      scope: "unknown:scope profile:read",
      state: "native-state",
    });
    const location = response.headers.get("Location");
    if (!location) throw new Error("Native callback location is missing");
    const callbackUrl = new URL(location);

    expect(response.status).toBe(302);
    expect(location).toMatch(/^com\.example\.app:\/oauth\/callback\?/);
    expect(callbackUrl.searchParams.get("existing")).toBe("1");
    expect(callbackUrl.searchParams.get("error")).toBe("invalid_scope");
    expect(callbackUrl.searchParams.get("state")).toBe("native-state");
  });

  test("registers the authorization endpoint through OpenAPIHono", ({
    dependencies,
  }) => {
    const document = dependencies.app.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "OAuth test", version: "1" },
    });

    expect(document.paths?.["/v2/oauth/authorize"]?.get).toMatchObject({
      operationId: "authorizeOAuthClient",
      responses: {
        "302": expect.any(Object),
        "400": expect.any(Object),
      },
    });
  });
});

type App = ReturnType<typeof appFactory>;

type AuthorizationParameters = {
  clientId: string;
  redirectUri: string;
  responseType: string | undefined;
  scope: string | undefined;
  state: string | undefined;
};

async function requestAuthorization(
  app: App,
  parameters: AuthorizationParameters,
) {
  const query = new URLSearchParams();
  setQueryParameter(query, "client_id", parameters.clientId);
  setQueryParameter(query, "redirect_uri", parameters.redirectUri);
  setQueryParameter(query, "response_type", parameters.responseType);
  setQueryParameter(query, "scope", parameters.scope);
  setQueryParameter(query, "state", parameters.state);

  return await app.request(`/v2/oauth/authorize?${query.toString()}`);
}

function hashAuthorizationRequestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setQueryParameter(
  query: URLSearchParams,
  name: string,
  value: string | undefined,
) {
  if (value !== undefined) query.set(name, value);
}

function responseLocation(response: Response) {
  const location = response.headers.get("Location");
  if (!location) throw new Error("OAuth redirect location is missing");
  return new URL(location);
}

async function seedOAuthClient(
  db: Database,
  redirectUris: readonly string[],
  options: { disabledAt?: Date } = {},
) {
  const clientId = randomUUID();
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("oauth_client")
      .values({
        disabled_at: options.disabledAt,
        id: clientId,
        name: "OAuth authorization test client",
        secret_hash: "test-secret-hash",
      })
      .execute();
    await tx
      .insertInto("oauth_client_redirect_uri")
      .values(
        redirectUris.map((redirectUri) => ({
          oauth_client_id: clientId,
          redirect_uri: redirectUri,
        })),
      )
      .execute();
  });

  return clientId;
}
