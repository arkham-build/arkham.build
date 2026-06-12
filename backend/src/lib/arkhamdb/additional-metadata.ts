import assert from "node:assert/strict";
import type { DeckWritePayload } from "@arkham-build/shared";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import type { ArkhamdbDeckAdditionalMetadata } from "../../db/schema.types.ts";
import { isEmpty } from "../is-empty.ts";
import type { ArkhamDbRemoteDeck } from "./api-client/core/dtos.ts";
import { applyHiddenSlots, extractHiddenSlots } from "./hidden-slots.ts";

export function decodeDeckMeta(meta: string): Record<string, unknown> {
  try {
    const metaJson = JSON.parse(meta);
    return typeof metaJson === "object" && metaJson != null ? metaJson : {};
  } catch {
    return {};
  }
}

export function partitionDeckMeta(meta: Record<string, unknown>) {
  const additionalMeta: Record<string, unknown> = {};
  const deckMeta: Record<string, unknown> = {};

  for (const key of Object.keys(meta)) {
    if (
      key.startsWith("fan_made_content") ||
      key.startsWith("card_pool_extension_") ||
      key.startsWith("hidden_slots") ||
      key.startsWith("annotation_") ||
      key.startsWith("intro_md") ||
      key.startsWith("sealed_deck") ||
      key.startsWith("banner_url") ||
      key.startsWith("buildql_deck_options_override") ||
      key.startsWith("custom_behavior")
    ) {
      additionalMeta[key] = meta[key];
    } else {
      deckMeta[key] = meta[key];
    }
  }

  return { additionalMeta, deckMeta };
}

export async function storeAdditionalMetadata<T extends DeckWritePayload>(
  database: Database,
  id: string | number,
  deck: T,
): Promise<T> {
  const preparedDeck = { ...deck };

  extractHiddenSlots(preparedDeck);

  const meta = decodeDeckMeta(preparedDeck.meta ?? "");

  if (meta["amk"]) {
    throw new HTTPException(400, {
      message: "amk is already present in this deck's meta.",
    });
  }

  const { additionalMeta, deckMeta } = partitionDeckMeta(meta);
  if (isEmpty(additionalMeta)) return preparedDeck;

  const amk = await upsertAdditionalMetadata(database, {
    deckId: id,
    data: additionalMeta,
  });

  return {
    ...preparedDeck,
    meta: JSON.stringify({ ...deckMeta, amk }),
  };
}

export async function findAdditionalMetadata(db: Database, id: string) {
  const row = await db
    .selectFrom("arkhamdb_deck_additional_metadata")
    .select(["data"])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

  return parseAdditionalMetadata(row.data);
}

export async function mergeAdditionalMeta(
  database: Database,
  deck: ArkhamDbRemoteDeck,
): Promise<ArkhamDbRemoteDeck> {
  const meta = decodeDeckMeta(deck.meta ?? "");
  let mergedDeck = { ...deck };

  if (meta["amk"]) {
    const { amk, ...rest } = meta;

    if (typeof amk !== "string") {
      mergedDeck = { ...mergedDeck, meta: JSON.stringify(rest) };
    } else {
      const additionalMeta = await findAdditionalMetadata(database, amk);

      mergedDeck = {
        ...mergedDeck,
        meta: JSON.stringify({ ...rest, ...additionalMeta }),
      };
    }
  }

  applyHiddenSlots(mergedDeck);

  return mergedDeck;
}

type AdditionalMetadataInput = {
  data: Record<string, unknown>;
  deckId: string | number;
};

async function upsertAdditionalMetadata(
  db: Database,
  input: AdditionalMetadataInput,
) {
  const row = await db
    .insertInto("arkhamdb_deck_additional_metadata")
    .values({
      data: JSON.stringify(input.data),
      deck_id: parseDeckId(input.deckId),
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  return row.id;
}

function parseDeckId(deckId: string | number) {
  const parsedDeckId = typeof deckId === "number" ? deckId : Number(deckId);

  assert(
    Number.isInteger(parsedDeckId),
    "Expected an integer ArkhamDB deck id.",
  );

  return parsedDeckId;
}

function parseAdditionalMetadata(
  data: ArkhamdbDeckAdditionalMetadata["data"],
): Record<string, unknown> {
  assert(data && typeof data === "object" && !Array.isArray(data));
  return data;
}
