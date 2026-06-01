import type { Context } from "hono";
import type { HonoEnv } from "../../hono-env.ts";
import type { OAuthAccessToken } from "../../oauth.ts";
import {
  authenticatedRequest,
  authenticationHooks,
} from "./core/authenticated-request.ts";
import type { ArkhamDBDeck } from "./core/responses.ts";

export type _OperationResponse = {
  msg: string | number;
  success: boolean;
};

export async function fetchDecks(
  c: Context<HonoEnv>,
  accessToken: OAuthAccessToken,
) {
  const res = await authenticatedRequest<ArkhamDBDeck[]>(
    c,
    "/decks",
    accessToken,
    {},
    {
      hooks: authenticationHooks,
    },
  );

  return res;
}
