import assert from "node:assert";
import type { Hono } from "hono";
import { describe, expect, vi } from "vitest";
import { createSession } from "../lib/auth/sessions.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

const STEAM_ID = "76561198000000000";
const STEAM_OPENID_LOGIN_URL = "https://steamcommunity.com/openid/login";
const STEAM_OPENID_NS = "http://specs.openid.net/auth/2.0";
const STEAM_OPENID_IDENTIFIER_SELECT = `${STEAM_OPENID_NS}/identifier_select`;
const STEAM_PROFILE = {
  avatarUrl: "https://cdn.example.com/steam-avatar.jpg",
  displayName: "Steam User",
  profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/`,
};

describe("Steam OpenID auth", () => {
  describe("GET /auth/steam/connect", () => {
    test("requires authentication", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/auth/steam/connect", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });

    test("redirects to Steam OpenID", async ({ dependencies }) => {
      const { app, config, sessionCookie } = dependencies;

      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );

      expect(openid.url.origin + openid.url.pathname).toBe(
        STEAM_OPENID_LOGIN_URL,
      );
      expect(openid.url.searchParams.get("openid.ns")).toBe(STEAM_OPENID_NS);
      expect(openid.url.searchParams.get("openid.mode")).toBe("checkid_setup");
      expect(openid.url.searchParams.get("openid.realm")).toBe(
        `${new URL(config.STEAM_OPENID_RETURN_URI).origin}/`,
      );
      expect(openid.url.searchParams.get("openid.identity")).toBe(
        STEAM_OPENID_IDENTIFIER_SELECT,
      );
      expect(openid.url.searchParams.get("openid.claimed_id")).toBe(
        STEAM_OPENID_IDENTIFIER_SELECT,
      );
      expect(openid.returnTo.origin + openid.returnTo.pathname).toBe(
        config.STEAM_OPENID_RETURN_URI,
      );
      expect(openid.state).toBeTruthy();
    });

    test("rejects OAuth returnTo", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await app.request(
        "/auth/steam/connect?returnTo=https://evil.example",
        {
          method: "GET",
          headers: { Cookie: sessionCookie },
        },
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Invalid returnTo");
    });
  });

  describe("GET /auth/steam/callback", () => {
    test("connects a Steam identity for the authenticated account", async ({
      dependencies,
    }) => {
      const { app, config, db, sessionCookie } = dependencies;
      const account = await findTestAccount(db);
      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );
      const fetchMock = mockSteamOpenId({ steamId: STEAM_ID });

      const res = await app.request(
        makeSteamOpenIdCallbackPath(config, openid.state, STEAM_ID),
        {
          method: "GET",
          headers: { Cookie: openid.cookie },
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `${config.FRONTEND_URL}/settings?tab=account`,
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const identity = await db
        .selectFrom("account_identity")
        .select(["account_id", "id", "provider", "provider_user_id", "state"])
        .where("provider", "=", "steam")
        .where("provider_user_id", "=", STEAM_ID)
        .executeTakeFirst();

      expect(identity).toMatchObject({
        account_id: account.id,
        provider: "steam",
        provider_user_id: STEAM_ID,
        state: STEAM_PROFILE,
      });
      assert(identity, "Missing Steam identity");

      await expect(
        db
          .selectFrom("oauth_token")
          .select(["account_identity_id"])
          .where("account_identity_id", "=", identity.id)
          .execute(),
      ).resolves.toHaveLength(0);
    });

    test("reconnect updates Steam profile state", async ({ dependencies }) => {
      const { app, config, db, sessionCookie } = dependencies;
      const account = await findTestAccount(db);

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "steam",
          provider_user_id: STEAM_ID,
          state: {
            avatarUrl: "https://cdn.example.com/old-avatar.jpg",
            displayName: "Old Steam User",
            profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/old`,
          },
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );
      mockSteamOpenId({
        profile: {
          avatarUrl: "https://cdn.example.com/new-avatar.jpg",
          displayName: "New Steam User",
          profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/new`,
        },
        steamId: STEAM_ID,
      });

      const res = await app.request(
        makeSteamOpenIdCallbackPath(config, openid.state, STEAM_ID),
        {
          method: "GET",
          headers: { Cookie: openid.cookie },
        },
      );

      expect(res.status).toBe(302);

      const identity = await db
        .selectFrom("account_identity")
        .select(["state"])
        .where("account_id", "=", account.id)
        .where("provider", "=", "steam")
        .executeTakeFirstOrThrow();

      expect(identity.state).toEqual({
        avatarUrl: "https://cdn.example.com/new-avatar.jpg",
        displayName: "New Steam User",
        profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/new`,
      });
    });

    test("redirects connect conflicts back to account settings", async ({
      dependencies,
    }) => {
      const { app, config, db, sessionCookie } = dependencies;
      const otherAccount = await db
        .insertInto("account")
        .values({ name: "other-steam-account" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: otherAccount.id,
          provider: "steam",
          provider_user_id: STEAM_ID,
          state: STEAM_PROFILE,
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );
      mockSteamOpenId({ steamId: STEAM_ID });

      const res = await app.request(
        makeSteamOpenIdCallbackPath(config, openid.state, STEAM_ID),
        {
          method: "GET",
          headers: { Cookie: openid.cookie },
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `${config.FRONTEND_URL}/settings?tab=account&oauth_error=identity_belongs_to_another_account`,
      );
    });

    test("redirects invalid state back to account settings", async ({
      dependencies,
    }) => {
      const { app, config, sessionCookie } = dependencies;
      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );

      const res = await app.request(
        makeSteamOpenIdCallbackPath(config, "wrong-state", STEAM_ID),
        {
          method: "GET",
          headers: { Cookie: openid.cookie },
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `${config.FRONTEND_URL}/settings?tab=account&oauth_error=invalid_state`,
      );
    });

    test("redirects invalid assertions with a generic error", async ({
      dependencies,
    }) => {
      const { app, config, sessionCookie } = dependencies;
      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );
      mockSteamOpenId({ assertionValid: false, steamId: STEAM_ID });

      const res = await app.request(
        makeSteamOpenIdCallbackPath(config, openid.state, STEAM_ID),
        {
          method: "GET",
          headers: { Cookie: openid.cookie },
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `${config.FRONTEND_URL}/settings?tab=account&oauth_error=oauth_account_connection_failed`,
      );
    });

    test("redirects invalid profile responses with a generic error", async ({
      dependencies,
    }) => {
      const { app, config, sessionCookie } = dependencies;
      const openid = await startSteamOpenIdFlow(
        app,
        "/auth/steam/connect",
        sessionCookie,
      );
      mockSteamOpenId({ profilePlayers: [], steamId: STEAM_ID });

      const res = await app.request(
        makeSteamOpenIdCallbackPath(config, openid.state, STEAM_ID),
        {
          method: "GET",
          headers: { Cookie: openid.cookie },
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `${config.FRONTEND_URL}/settings?tab=account&oauth_error=oauth_account_connection_failed`,
      );
    });
  });

  describe("DELETE /v2/account/auth/oauth/:provider", () => {
    test("disconnects a Steam identity when a usable login identity exists", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const account = await findTestAccount(db);

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "steam",
          provider_user_id: STEAM_ID,
          state: STEAM_PROFILE,
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const res = await app.request("/v2/account/auth/oauth/steam", {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);

      const identity = await db
        .selectFrom("account_identity")
        .select(["id"])
        .where("account_id", "=", account.id)
        .where("provider", "=", "steam")
        .executeTakeFirst();

      expect(identity).toBeUndefined();
    });

    test("does not count Steam as a usable login identity", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;
      const account = await db
        .insertInto("account")
        .values({ name: "arkhamdb-steam-account" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values([
          {
            account_id: account.id,
            provider: "arkhamdb",
            provider_user_id: "arkhamdb-steam-user",
            verified_at: new Date(),
          },
          {
            account_id: account.id,
            provider: "steam",
            provider_user_id: STEAM_ID,
            state: STEAM_PROFILE,
            verified_at: new Date(),
          },
        ])
        .executeTakeFirstOrThrow();

      const session = await createSession(db, account.id, 1);

      const res = await app.request("/v2/account/auth/oauth/arkhamdb", {
        method: "DELETE",
        headers: { Cookie: `${config.SESSION_COOKIE_NAME}=${session.token}` },
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain(
        "Account must have at least one login identity",
      );
    });
  });

  describe("GET /v2/account/auth/me", () => {
    test("includes Steam connection details for authenticated user", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;
      const account = await findTestAccount(db);

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "steam",
          provider_user_id: STEAM_ID,
          state: STEAM_PROFILE,
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const res = await app.request("/v2/account/auth/me", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { identities: unknown[] };
      expect(body.identities).toContainEqual({
        provider: "steam",
        providerUserId: STEAM_ID,
        canDisconnect: true,
        details: STEAM_PROFILE,
      });
    });
  });
});

async function startSteamOpenIdFlow(
  app: Hono<HonoEnv>,
  path: string,
  cookie: string,
) {
  const res = await app.request(path, {
    method: "GET",
    headers: { Cookie: cookie },
  });

  const location = res.headers.get("location");
  assert(location, "Missing location header");

  const url = new URL(location);
  const returnToValue = url.searchParams.get("openid.return_to");
  assert(returnToValue, "Missing Steam OpenID return_to");

  const returnTo = new URL(returnToValue);
  const state = returnTo.searchParams.get("state");
  assert(state, "Missing Steam OpenID state");

  const setCookie = res.headers.get("set-cookie");
  assert(setCookie, "Missing set-cookie header");

  const [openidCookie] = setCookie.split(";", 1);
  assert(openidCookie, "Missing Steam OpenID cookie");

  return {
    cookie: openidCookie,
    returnTo,
    state,
    url,
  };
}

function makeSteamOpenIdCallbackPath(
  config: HonoEnv["Variables"]["config"],
  state: string,
  steamId: string,
  overrides: Record<string, string | null> = {},
) {
  const claimedId = `https://steamcommunity.com/openid/id/${steamId}`;
  const params = new URLSearchParams({
    state,
    "openid.ns": STEAM_OPENID_NS,
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_OPENID_LOGIN_URL,
    "openid.claimed_id": claimedId,
    "openid.identity": claimedId,
    "openid.return_to": getSteamOpenIdReturnTo(config, state),
    "openid.response_nonce": "2026-06-29T00:00:00Ztest",
    "openid.assoc_handle": "test-assoc-handle",
    "openid.signed":
      "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "test-signature",
  });

  for (const [key, value] of Object.entries(overrides)) {
    if (value == null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  return `/auth/steam/callback?${params.toString()}`;
}

function mockSteamOpenId(params: {
  assertionValid?: boolean;
  profile?: Partial<typeof STEAM_PROFILE>;
  profilePlayers?: unknown[];
  steamId: string;
}) {
  const fetchMock = vi.fn(
    (input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
      const url = getFetchUrl(input);

      if (url.toString() === STEAM_OPENID_LOGIN_URL) {
        expect(init?.method).toBe("POST");
        const body = new URLSearchParams(init?.body?.toString());
        expect(body.get("openid.mode")).toBe("check_authentication");

        return new Response(
          `is_valid:${params.assertionValid === false ? "false" : "true"}\n`,
          { status: 200 },
        );
      }

      if (
        url.origin + url.pathname ===
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
      ) {
        expect(url.searchParams.get("key")).toBe("test-steam-web-api-key");
        expect(url.searchParams.get("steamids")).toBe(params.steamId);

        return new Response(
          JSON.stringify({
            response: {
              players: params.profilePlayers ?? [
                {
                  avatarfull:
                    params.profile?.avatarUrl ?? STEAM_PROFILE.avatarUrl,
                  personaname:
                    params.profile?.displayName ?? STEAM_PROFILE.displayName,
                  profileurl:
                    params.profile?.profileUrl ?? STEAM_PROFILE.profileUrl,
                  steamid: params.steamId,
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function getSteamOpenIdReturnTo(
  config: HonoEnv["Variables"]["config"],
  state: string,
) {
  const url = new URL(config.STEAM_OPENID_RETURN_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

function getFetchUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") {
    return new URL(input);
  }

  if (input instanceof URL) {
    return input;
  }

  return new URL(input.url);
}

async function findTestAccount(db: HonoEnv["Variables"]["db"]) {
  return await db
    .selectFrom("account")
    .select(["id"])
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();
}
