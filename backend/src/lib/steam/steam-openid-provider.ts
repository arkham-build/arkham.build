import assert from "node:assert";
import type { Context } from "hono";
import { z } from "zod";

const STEAM_PLAYER_SUMMARIES_URL =
  "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";
const STEAM_OPENID_LOGIN_URL = "https://steamcommunity.com/openid/login";
const STEAM_OPENID_NS = "http://specs.openid.net/auth/2.0";
const STEAM_OPENID_IDENTIFIER_SELECT = `${STEAM_OPENID_NS}/identifier_select`;
const STEAM_CLAIMED_ID_PATTERN =
  /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export type SteamProfile = {
  avatarUrl: string;
  displayName: string;
  profileUrl: string;
};

export type SteamOpenIdIdentity = {
  profile: SteamProfile;
  providerUserId: string;
};

const SteamPlayerSummariesResponseSchema = z.object({
  response: z.object({
    players: z.array(
      z.object({
        avatarfull: z.url(),
        personaname: z.string().min(1),
        profileurl: z.url(),
        steamid: z.string(),
      }),
    ),
  }),
});

export const steamOpenIdProvider = {
  name: "steam",
  getAuthorizationUrl(c: Context, state: string) {
    const url = new URL(STEAM_OPENID_LOGIN_URL);
    url.searchParams.set("openid.ns", STEAM_OPENID_NS);
    url.searchParams.set("openid.mode", "checkid_setup");
    url.searchParams.set(
      "openid.return_to",
      getSteamOpenIdReturnToUrl(c, state),
    );
    url.searchParams.set(
      "openid.realm",
      `${new URL(c.get("config").STEAM_OPENID_RETURN_URI).origin}/`,
    );
    url.searchParams.set("openid.identity", STEAM_OPENID_IDENTIFIER_SELECT);
    url.searchParams.set("openid.claimed_id", STEAM_OPENID_IDENTIFIER_SELECT);
    return url.toString();
  },
  getCallbackPath(c: Context) {
    return new URL(c.get("config").STEAM_OPENID_RETURN_URI).pathname;
  },
  async getIdentity(c: Context, state: string): Promise<SteamOpenIdIdentity> {
    const params = getSteamOpenIdCallbackParams(c);

    if (
      params.get("openid.mode") !== "id_res" ||
      params.get("openid.ns") !== STEAM_OPENID_NS ||
      params.get("openid.return_to") !== getSteamOpenIdReturnToUrl(c, state)
    ) {
      throw new Error("steam_openid_invalid_config");
    }

    await validateSteamOpenIdAssertion(params);

    const steamId = parseSteamOpenIdSteamId(params.get("openid.claimed_id"));
    return {
      profile: await fetchSteamProfile(c, steamId),
      providerUserId: steamId,
    };
  },
};

function getSteamOpenIdReturnToUrl(c: Context, state: string) {
  const url = new URL(c.get("config").STEAM_OPENID_RETURN_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

function getSteamOpenIdCallbackParams(c: Context) {
  const params = new URLSearchParams();
  const url = new URL(c.req.url);

  for (const [key, value] of url.searchParams) {
    if (key.startsWith("openid.")) {
      params.append(key, value);
    }
  }

  return params;
}

async function fetchSteamProfile(
  c: Context,
  steamId: string,
): Promise<SteamProfile> {
  const url = new URL(STEAM_PLAYER_SUMMARIES_URL);
  url.searchParams.set("key", c.get("config").STEAM_WEB_API_KEY);
  url.searchParams.set("steamids", steamId);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("steam_profile_fetch_failed");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("steam_profile_invalid_response", { cause: error });
  }

  const parsed = SteamPlayerSummariesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("steam_profile_invalid_response", { cause: parsed.error });
  }

  const player = parsed.data.response.players.find(
    (player) => player.steamid === steamId,
  );

  if (!player) {
    throw new Error("steam_profile_not_found");
  }

  return {
    avatarUrl: player.avatarfull,
    displayName: player.personaname,
    profileUrl: player.profileurl,
  };
}

async function validateSteamOpenIdAssertion(params: URLSearchParams) {
  const body = new URLSearchParams(params);
  body.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("steam_openid_assertion_check_failed");
  }

  const result = parseSteamOpenIdKeyValueResponse(await response.text());

  assert(
    result.get("is_valid") === "true",
    "steam_openid_assertion_check_failed",
  );
}

function parseSteamOpenIdKeyValueResponse(body: string) {
  const result = new Map<string, string>();

  for (const line of body.split(/\r?\n/)) {
    if (!line) continue;

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      throw new Error("steam_openid_invalid_response");
    }

    result.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 1));
  }

  return result;
}

function parseSteamOpenIdSteamId(claimedId: string | null | undefined) {
  const match = claimedId?.match(STEAM_CLAIMED_ID_PATTERN);

  if (!match?.[1]) {
    throw new Error("steam_openid_invalid_claimed_id");
  }

  return match[1];
}
