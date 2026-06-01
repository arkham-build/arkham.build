import type { Context } from "hono";
import type { HonoEnv } from "../../hono-env.ts";
import { request } from "./core/request.ts";
import type { ArkhamDBDeck } from "./core/responses.ts";

export async function fetchDeck(
  c: Context<HonoEnv>,
  query: { id: string | number; type: string },
) {
  const res = await publicRequest<ArkhamDBDeck>(
    c,
    `/${query.type}/${query.id}`,
  );

  return res;

  // return {
  //   ...res,
  //   data: await mergeAdditionalMeta(c.env.DATABASE, res.data),
  // };
}

export async function fetchDeckHistory(
  c: Context<HonoEnv>,
  id: string | number,
): Promise<ArkhamDBDeck[]> {
  const { data: deck } = await fetchDeck(c, { id, type: "deck" });

  const [nextDecks, previousDecks] = await Promise.all([
    fetchSurroundingDeck(c, deck, "next_deck"),
    fetchSurroundingDeck(c, deck, "previous_deck"),
  ]);

  return [...nextDecks.reverse(), deck, ...previousDecks];
}

async function fetchSurroundingDeck(
  c: Context<HonoEnv>,
  deck: ArkhamDBDeck,
  idKey: "next_deck" | "previous_deck",
  decks: ArkhamDBDeck[] = [],
): Promise<ArkhamDBDeck[]> {
  if (!deck[idKey]) {
    return Promise.resolve(decks);
  }

  const { data } = await fetchDeck(c, {
    id: deck[idKey] as string | number,
    type: "deck",
  });

  decks.push(data);

  return fetchSurroundingDeck(c, data, idKey, decks);
}

function publicRequest<T>(c: Context<HonoEnv>, path: string) {
  return request<T>(c, `/api/public${path}`, {
    headers: {
      "X-Forwarded-For": c.req.header("CF-Connecting-IP") ?? "",
    },
  });
}
