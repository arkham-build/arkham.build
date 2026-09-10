import assert from "node:assert/strict";
import type { DeckWritePayload } from "@arkham-build/shared";
import { NoResultError } from "kysely";
import type { Database } from "../../db/db.ts";
import type { ArkhamdbDeckAdditionalMetadata } from "../../db/schema.types.ts";
import { fetchWithTimeout } from "../fetch-with-timeout.ts";
import { isEmpty } from "../is-empty.ts";
import type { ArkhamDbRemoteDeck } from "./api-client/core/dtos.ts";
import { applyHiddenSlots, extractHiddenSlots } from "./hidden-slots.ts";

export function decodeDeckMeta(meta: string): Record<string, unknown> {
  try {
    const metaJson = JSON.parse(meta);
    return isMetaObject(metaJson) ? metaJson : {};
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
      key === "deck_card_tags" ||
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

type StoreAdditionalMetadataOptions = {
  extractHiddenSlots?: boolean;
};

export async function storeAdditionalMetadata<T extends DeckWritePayload>(
  database: Database,
  id: string | number,
  deck: T,
  options: StoreAdditionalMetadataOptions = {},
): Promise<T> {
  const preparedDeck = { ...deck };

  if (options.extractHiddenSlots ?? true) {
    extractHiddenSlots(preparedDeck);
  }

  const meta = decodeDeckMeta(preparedDeck.meta ?? "");
  const { amk: _amk, ...metaWithoutAmk } = meta;

  const { additionalMeta, deckMeta } = partitionDeckMeta(metaWithoutAmk);
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

type MergeAdditionalMetaOptions = {
  legacyApiBaseUrl?: string;
};

export async function mergeAdditionalMeta(
  database: Database,
  deck: ArkhamDbRemoteDeck,
  options: MergeAdditionalMetaOptions = {},
): Promise<ArkhamDbRemoteDeck> {
  const meta = decodeDeckMeta(deck.meta ?? "");
  let mergedDeck = { ...deck, meta: JSON.stringify(meta) };

  if (meta["amk"]) {
    const { amk, ...rest } = meta;

    if (typeof amk !== "string") {
      mergedDeck = { ...mergedDeck, meta: JSON.stringify(rest) };
    } else {
      const additionalMeta = await findAdditionalMetadata(database, amk).catch(
        async (error) => {
          if (error instanceof NoResultError) {
            return await fetchLegacyAdditionalMetadata(
              options.legacyApiBaseUrl,
              amk,
            );
          }

          throw error;
        },
      );

      const mergedMeta = additionalMeta ? { ...rest, ...additionalMeta } : rest;

      mergedDeck = {
        ...mergedDeck,
        meta: JSON.stringify(mergedMeta),
      };
    }
  }

  applyHiddenSlots(mergedDeck);

  return mergedDeck;
}

async function fetchLegacyAdditionalMetadata(
  legacyApiBaseUrl: string | undefined,
  id: string,
) {
  if (!legacyApiBaseUrl) return undefined;

  const url = new URL(
    `/v1/public/additional_metadata/${encodeURIComponent(id)}`,
    legacyApiBaseUrl,
  );

  const res = await fetchWithTimeout(url, {
    headers: { accept: "application/json" },
  });

  if (res.status === 404) return undefined;
  if (!res.ok) return undefined;

  const data = (await res.json()) as ArkhamdbDeckAdditionalMetadata["data"];
  return parseAdditionalMetadata(data);
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
  assert(isMetaObject(data));
  return data;
}

function isMetaObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
