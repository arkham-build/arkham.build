import assert from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import type { Deck } from "@arkham-build/shared";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Transaction } from "kysely";
import { ZodError } from "zod";
import type { DB } from "../../db/schema.types.ts";
import {
  ArkhamDbDeckSnapshotUnavailableError,
  createArkhamDbDeck,
  deleteArkhamDbDeck,
  fetchArkhamDbDeck,
  fetchArkhamDbDeckBatch,
  fetchArkhamDbDeckManifest,
  saveArkhamDbDeck,
  upgradeArkhamDbDeck,
} from "../../lib/arkhamdb/api-client/user-service.ts";
import { ApiError } from "../../lib/arkhamdb/api-client/core/errors.ts";
import { getAccountIdentityByAccountIdAndProvider } from "../../lib/auth/account-identities.ts";
import { authenticatedAccountId } from "../../lib/auth/authenticated-account.ts";
import {
  ACCOUNT_PROVIDER_TYPE,
  mapDeckRowToDto,
  mapDeckWriteDtoToInsert,
} from "../../lib/deck-mapping.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import {
  collectAccountDeckHistoryIds,
  findAccountDeckById,
  listAccountDecksByIds,
  listAccountDecksForManifest,
  lockAccountDeckById,
} from "../decks/queries.ts";
import type { OAuthDeck, OAuthDeckSource, OAuthDeckTarget } from "./dtos.ts";

type DeckContext<E extends HonoEnv = HonoEnv> = Context<E>;
type ManifestItem = {
  source: OAuthDeckSource;
  id: string | number;
  updatedAt: string;
  version: string;
};

export async function getOAuthDeckManifest<E extends HonoEnv>(
  c: DeckContext<E>,
  source: OAuthDeckSource | undefined,
) {
  const db = c.get("db");
  const accountId = authenticatedAccountId(c);
  const includeAccount = source == null || source === "account";
  const includeArkhamDb = source == null || source === "arkhamdb";
  const decks: ManifestItem[] = [];

  if (includeAccount) {
    const accountDecks = await listAccountDecksForManifest(db, accountId);
    decks.push(
      ...accountDecks.map((deck) => ({
        source: "account" as const,
        id: deck.id,
        updatedAt: deck.updated_at.toISOString(),
        version: deck.version ?? "",
      })),
    );
  }

  const arkhamDbIdentity = await getAccountIdentityByAccountIdAndProvider(
    db,
    accountId,
    "arkhamdb",
  );
  let arkhamDbAvailable = false;
  let arkhamDbSyncToken: string | null = null;

  if (includeArkhamDb && arkhamDbIdentity) {
    try {
      const manifest = await fetchArkhamDbDeckManifest(c, { force: true });
      arkhamDbSyncToken = manifest.arkhamdbSyncToken;
      decks.push(
        ...manifest.decks.map((deck) => ({
          source: "arkhamdb" as const,
          id: deck.id,
          updatedAt: deck.updatedAt,
          version: deck.version,
        })),
      );
      arkhamDbAvailable = true;
    } catch (error) {
      if (!isArkhamDbUnavailable(error)) throw error;

      c.get("logger")("warn", "ArkhamDB OAuth deck manifest unavailable", {
        accountId,
        error: error.message,
        ...(error instanceof ApiError ? { status: error.status } : {}),
      });
    }
  } else if (!includeArkhamDb && arkhamDbIdentity) {
    arkhamDbAvailable = true;
  }

  const orderedDecks = orderManifestItems(decks);
  return {
    version: createManifestVersion(orderedDecks),
    arkhamdbSyncToken: arkhamDbSyncToken,
    providers: {
      account: { available: true },
      arkhamdb: { available: arkhamDbAvailable },
    },
    decks: orderedDecks,
  };
}

export async function getOAuthDeckBatch<E extends HonoEnv>(
  c: DeckContext<E>,
  targets: OAuthDeckTarget[],
  arkhamDbSyncToken: string | null | undefined,
) {
  const accountIds = [
    ...new Set(
      targets
        .filter((target) => target.source === "account")
        .map((target) => target.id),
    ),
  ];
  const arkhamDbIds = [
    ...new Set(
      targets
        .filter((target) => target.source === "arkhamdb")
        .map((target) => target.id),
    ),
  ];

  const accountDecks = await listAccountDecksByIds(
    c.get("db"),
    authenticatedAccountId(c),
    accountIds,
  );
  const decksByTarget = new Map<string, Deck>(
    accountDecks.map((deck) => [
      targetKey("account", deck.id),
      mapDeckRowToDto(deck),
    ]),
  );

  if (arkhamDbIds.length) {
    assert(
      arkhamDbSyncToken,
      "ArkhamDB batch targets require a manifest sync token.",
    );
    const arkhamDbDecks = await requireArkhamDb(() =>
      fetchArkhamDbDeckBatch(c, arkhamDbIds, arkhamDbSyncToken),
    );
    for (const deck of arkhamDbDecks) {
      decksByTarget.set(targetKey("arkhamdb", deck.id), deck);
    }
  }

  return targets.map((target) => {
    const deck = decksByTarget.get(targetKey(target.source, target.id));
    if (!deck) throw deckNotFound();
    return deck;
  });
}

export async function getOAuthDeck<E extends HonoEnv>(
  c: DeckContext<E>,
  source: OAuthDeckSource,
  id: string | number,
) {
  if (source === "arkhamdb") {
    return await requireArkhamDb(() => fetchArkhamDbDeck(c, id));
  }

  const deck = await findAccountDeckById(
    c.get("db"),
    authenticatedAccountId(c),
    String(id),
  );
  if (!deck) throw deckNotFound();
  return mapDeckRowToDto(deck);
}

export async function createOAuthDeck<E extends HonoEnv>(
  c: DeckContext<E>,
  source: OAuthDeckSource,
  payload: OAuthDeck,
) {
  if (source === "arkhamdb") {
    return await requireArkhamDb(() => createArkhamDbDeck(c, payload));
  }

  const now = new Date();
  const deck = await c
    .get("db")
    .insertInto("deck")
    .values({
      ...mutableDeckValues(payload, null, null),
      account_id: authenticatedAccountId(c),
      created_at: now,
      id: randomUUID(),
      provider_type: ACCOUNT_PROVIDER_TYPE,
      updated_at: now,
      version: "0.1",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return mapDeckRowToDto(deck);
}

export async function updateOAuthDeck<E extends HonoEnv>(
  c: DeckContext<E>,
  source: OAuthDeckSource,
  id: string | number,
  payload: OAuthDeck,
) {
  if (source === "arkhamdb") {
    return await requireArkhamDb(() => saveArkhamDbDeck(c, id, payload));
  }

  const accountId = authenticatedAccountId(c);
  return await c
    .get("db")
    .transaction()
    .execute(async (tx: Transaction<DB>) => {
      const current = await lockAccountDeckById(tx, accountId, String(id));
      if (!current) throw deckNotFound();

      const updated = await tx
        .updateTable("deck")
        .set({
          ...mutableDeckValues(payload, current.prev_deck, current.next_deck),
          updated_at: new Date(),
          version: incrementDeckVersion(current.version),
        })
        .where("account_id", "=", accountId)
        .where("id", "=", current.id)
        .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
        .returningAll()
        .executeTakeFirstOrThrow();
      return mapDeckRowToDto(updated);
    });
}

export async function upgradeOAuthDeck<E extends HonoEnv>(
  c: DeckContext<E>,
  source: OAuthDeckSource,
  id: string | number,
  payload: OAuthDeck,
) {
  if (source === "arkhamdb") {
    return await upgradeOAuthArkhamDbDeck(c, id, payload);
  }

  const accountId = authenticatedAccountId(c);
  return await c
    .get("db")
    .transaction()
    .execute(async (tx: Transaction<DB>) => {
      const current = await lockAccountDeckById(tx, accountId, String(id));
      if (!current) throw deckNotFound();
      if (current.next_deck != null) {
        throw new HTTPException(409, {
          message: "Deck already has an upgrade",
        });
      }

      const now = new Date();
      const childId = randomUUID();
      const child = await tx
        .insertInto("deck")
        .values({
          ...mutableDeckValues(payload, current.id, null),
          account_id: accountId,
          created_at: now,
          id: childId,
          provider_type: ACCOUNT_PROVIDER_TYPE,
          updated_at: now,
          version: "0.1",
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await tx
        .updateTable("deck")
        .set({
          next_deck: childId,
          updated_at: now,
          version: incrementDeckVersion(current.version),
        })
        .where("account_id", "=", accountId)
        .where("id", "=", current.id)
        .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
        .executeTakeFirstOrThrow();

      return mapDeckRowToDto(child);
    });
}

export async function deleteOAuthDeck<E extends HonoEnv>(
  c: DeckContext<E>,
  source: OAuthDeckSource,
  id: string | number,
  all: boolean,
) {
  if (source === "arkhamdb") {
    await requireArkhamDb(() => deleteArkhamDbDeck(c, id, all));
    return;
  }

  const accountId = authenticatedAccountId(c);
  await c
    .get("db")
    .transaction()
    .execute(async (tx: Transaction<DB>) => {
      const current = await lockAccountDeckById(tx, accountId, String(id));
      if (!current) throw deckNotFound();

      const ids = all
        ? await collectAccountDeckHistoryIds(tx, accountId, current)
        : [current.id];
      await tx
        .deleteFrom("deck")
        .where("account_id", "=", accountId)
        .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
        .where("id", "in", ids)
        .execute();
    });
}

function mutableDeckValues(
  deck: OAuthDeck,
  previousDeck: string | null,
  nextDeck: string | null,
) {
  return mapDeckWriteDtoToInsert({
    description_md: deck.description_md,
    exile_string: deck.exile_string,
    ignoreDeckLimitSlots: deck.ignoreDeckLimitSlots,
    investigator_code: deck.investigator_code,
    investigator_name: deck.investigator_name,
    meta: deck.meta,
    name: deck.name,
    next_deck: nextDeck,
    previous_deck: previousDeck,
    problem: deck.problem,
    sideSlots: deck.sideSlots,
    slots: deck.slots,
    taboo_id: deck.taboo_id,
    tags: deck.tags,
    xp_adjustment: deck.xp_adjustment,
    xp_spent: deck.xp_spent,
    xp: deck.xp,
  });
}

async function upgradeOAuthArkhamDbDeck<E extends HonoEnv>(
  c: DeckContext<E>,
  id: string | number,
  payload: OAuthDeck,
) {
  const current = await requireArkhamDb(() => fetchArkhamDbDeck(c, id));
  if (current.next_deck != null) {
    throw new HTTPException(409, { message: "Deck already has an upgrade" });
  }

  const carryoverXp =
    (current.xp ?? 0) + (current.xp_adjustment ?? 0) - (current.xp_spent ?? 0);
  const upgradeXp = Math.max((payload.xp ?? 0) - carryoverXp, 0);

  return await requireArkhamDb(() =>
    upgradeArkhamDbDeck(c, id, {
      ...payload,
      exile_string: payload.exile_string,
      meta: payload.meta,
      xp: upgradeXp,
    }),
  );
}

function incrementDeckVersion(version: string | null) {
  const match = /^(\d+)\.(\d+)$/.exec(version ?? "");
  if (!match) {
    throw new HTTPException(409, {
      message: "Deck version cannot be incremented",
    });
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  assert(Number.isSafeInteger(major) && Number.isSafeInteger(minor));
  return `${major}.${minor + 1}`;
}

function orderManifestItems(items: ManifestItem[]) {
  return [...items].sort((left, right) => {
    const leftKey = manifestItemKey(left);
    const rightKey = manifestItemKey(right);
    if (leftKey < rightKey) return -1;
    if (leftKey > rightKey) return 1;
    return 0;
  });
}

function createManifestVersion(items: ManifestItem[]) {
  const hash = createHash("sha256");
  for (const item of items) hash.update(manifestItemKey(item));
  return hash.digest("hex");
}

function manifestItemKey(item: ManifestItem) {
  return `${item.source}:${String(item.id)}:${item.version}:${item.updatedAt}\n`;
}

function targetKey(source: OAuthDeckSource, id: string | number) {
  return `${source}:${String(id)}`;
}

async function requireArkhamDb<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ArkhamDbDeckSnapshotUnavailableError) {
      throw new HTTPException(409, { message: error.message });
    }
    if (error instanceof ApiError && error.status === 404) {
      throw deckNotFound();
    }
    if (isArkhamDbUnavailable(error)) {
      throw new HTTPException(503, { message: "ArkhamDB is unavailable" });
    }
    throw error;
  }
}

function isArkhamDbUnavailable(error: unknown): error is Error {
  return (
    error instanceof ApiError ||
    error instanceof ZodError ||
    (error instanceof Error &&
      error.message === "Missing ArkhamDB identity or OAuth token for account.")
  );
}

function deckNotFound() {
  return new HTTPException(404, { message: "Deck not found" });
}
