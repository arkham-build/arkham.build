import assert from "node:assert";
import {
  ArkhamDbIdentityStateSchema,
  type Deck,
  type DeckId,
  type DeckManifestItem,
  type DeckWritePayload,
} from "@arkham-build/shared";
import type { Context } from "hono";
import { z } from "zod";
import { getAccountIdentityByAccountIdAndProvider } from "../../auth/account-identities.ts";
import { authenticatedAccountId } from "../../auth/authenticated-account.ts";
import type { HonoEnv } from "../../hono-env.ts";
import { log } from "../../logger.ts";
import { mergeAdditionalMeta } from "../additional-metadata.ts";
import {
  createDeck,
  deleteDeck,
  fetchDeck,
  saveDeck,
  syncDecks,
  upgradeDeck,
} from "./api-user.ts";
import {
  type ArkhamDbRemoteDeck,
  ArkhamDbRemoteDeckSchema,
  ArkhamDbRemoteDecksSchema,
} from "./core/dtos.ts";
import { ApiError } from "./core/errors.ts";
import {
  type ArkhamDbExecutor,
  withArkhamDbExecutor,
} from "./core/execute-with-lock.ts";
import {
  createArkhamDbDeckSnapshot,
  deleteArkhamDbDeckFromSnapshots,
  findArkhamDbDeckSnapshotByAccountIdAndId,
  findLatestArkhamDbDeckSnapshotByAccountIdentityId,
  upsertArkhamDbDeckInSnapshots,
} from "./deck-snapshots.ts";
import { mapArkhamDbDeckToDto } from "./mapping.ts";

export class ArkhamDbDeckSnapshotUnavailableError extends ApiError {
  constructor() {
    super("ArkhamDB deck snapshot is unavailable; request a new manifest", 409);
    this.name = "ArkhamDbDeckSnapshotUnavailableError";
  }
}

export async function fetchArkhamDbDeck<E extends HonoEnv>(
  c: Context<E>,
  id: string | number,
) {
  const response = await fetchDeck(c, id);
  return mapArkhamDbDeckToDto(response.data);
}

export async function fetchArkhamDbDeckBatch<E extends HonoEnv>(
  c: Context<E>,
  ids: DeckId[],
  arkhamdbSyncToken?: string,
) {
  if (!ids.length) return [];

  const syncToken = arkhamdbSyncToken
    ? arkhamdbSyncToken
    : (await fetchArkhamDbDeckManifest(c, { force: true })).arkhamdbSyncToken;
  const snapshot = await findArkhamDbDeckSnapshotByAccountIdAndId(
    c.get("db"),
    authenticatedAccountId(c),
    syncToken,
  );
  if (!snapshot) {
    throw new ArkhamDbDeckSnapshotUnavailableError();
  }

  const snapshotDecks = ArkhamDbRemoteDecksSchema.parse(snapshot.decks);

  const snapshotDecksById = new Map(
    snapshotDecks.map((deck) => [String(deck.id), deck]),
  );

  const decks: Deck[] = [];
  const mappedDecksById = new Map<string, Deck>();

  for (const id of ids) {
    const key = String(id);
    const mappedDeck = mappedDecksById.get(key);

    if (mappedDeck) {
      decks.push(mappedDeck);
      continue;
    }

    const snapshotDeck = snapshotDecksById.get(key);
    if (!snapshotDeck) {
      throw new ApiError(`Deck ${id} not found in snapshot.`, 404);
    }

    const deck = mapArkhamDbDeckToDto(
      await mergeAdditionalMeta(c.get("db"), snapshotDeck, {
        legacyApiBaseUrl: c.get("config").LEGACY_API_BASE_URL,
      }),
    );
    mappedDecksById.set(key, deck);
    decks.push(deck);
  }

  return decks;
}

export async function fetchArkhamDbDeckManifest<E extends HonoEnv>(
  c: Context<E>,
  opts: { force?: boolean } = {},
): Promise<{ arkhamdbSyncToken: string; decks: DeckManifestItem[] }> {
  const db = c.get("db");
  const accountId = authenticatedAccountId(c);

  const identity = await getAccountIdentityByAccountIdAndProvider(
    db,
    accountId,
    "arkhamdb",
  );

  if (!identity) {
    throw new ApiError(
      "Missing ArkhamDB identity or OAuth token for account.",
      503,
    );
  }

  const snapshot = await findLatestArkhamDbDeckSnapshotByAccountIdentityId(
    db,
    identity.id,
  );

  if (
    snapshot &&
    !opts.force &&
    isFreshArkhamDbSnapshot(identity.state, snapshot)
  ) {
    return getArkhamDbManifestFromSnapshot(snapshot);
  }

  const syncedAt = new Date();

  log("info", "arkhamdb_sync_start");

  const response = await syncDecks(
    c,
    syncedAt,
    snapshot?.last_modified ?? null,
  );

  log("info", "arkhamdb_sync_success", {
    status: response.status,
  });

  if (response.status === 200) {
    assert(response.data, "Missing deck data for successful sync.");

    const createdSnapshot = await createArkhamDbDeckSnapshot(
      db,
      identity.id,
      response.headers["last-modified"] ?? null,
      response.data,
    );
    return {
      arkhamdbSyncToken: createdSnapshot.id,
      decks: response.data.map(mapArkhamDbDeckToManifestItem),
    };
  }

  assert(snapshot, "Missing ArkhamDB snapshot for 304 response.");

  return getArkhamDbManifestFromSnapshot(snapshot);
}

export async function saveArkhamDbDeck<E extends HonoEnv>(
  c: Context<E>,
  id: string | number,
  deck: DeckWritePayload,
): Promise<Deck> {
  return await withArkhamDbExecutor(c, async (executor) => {
    const response = await saveDeck(executor, id, deck);
    await upsertArkhamDbSnapshotDeck(executor, response.data);
    return {
      ...mapArkhamDbDeckToDto(response.data),
      xp: response.data.xp ?? deck.xp ?? null,
    };
  });
}

export async function createArkhamDbDeck<E extends HonoEnv>(
  c: Context<E>,
  deck: DeckWritePayload,
): Promise<Deck> {
  return await withArkhamDbExecutor(c, async (executor) => {
    const response = await createDeck(executor, deck);
    await upsertArkhamDbSnapshotDeck(executor, response.data);
    return {
      ...mapArkhamDbDeckToDto(response.data),
      xp: response.data.xp ?? deck.xp ?? null,
    };
  });
}

export async function upgradeArkhamDbDeck<E extends HonoEnv>(
  c: Context<E>,
  id: string | number,
  deck: DeckWritePayload,
): Promise<Deck> {
  return await withArkhamDbExecutor(c, async (executor) => {
    const response = await upgradeDeck(executor, id, deck);
    await upsertArkhamDbSnapshotDeck(executor, response.data);
    return {
      ...mapArkhamDbDeckToDto(response.data),
      xp: response.data.xp ?? 0,
    };
  });
}

export async function deleteArkhamDbDeck<E extends HonoEnv>(
  c: Context<E>,
  deckId: string | number,
  all?: boolean,
) {
  await withArkhamDbExecutor(c, async (executor) => {
    await deleteDeck(executor, deckId, all);
    await deleteArkhamDbSnapshotDeck(executor, deckId, all ?? false);
  });
}

const ArkhamDbRemoteDeckManifestSourceSchema = ArkhamDbRemoteDeckSchema.pick({
  date_creation: true,
  date_update: true,
  id: true,
  version: true,
});
const ArkhamDbRemoteDeckManifestSourcesSchema = z.array(
  ArkhamDbRemoteDeckManifestSourceSchema,
);

type ArkhamDbRemoteDeckManifestSource = Pick<
  ArkhamDbRemoteDeck,
  "date_creation" | "date_update" | "id" | "version"
>;

type ArkhamDbDeckSnapshotRow = NonNullable<
  Awaited<ReturnType<typeof findLatestArkhamDbDeckSnapshotByAccountIdentityId>>
>;

const ARKHAMDB_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getArkhamDbManifestFromSnapshot(snapshot: ArkhamDbDeckSnapshotRow) {
  const remoteDecks = ArkhamDbRemoteDeckManifestSourcesSchema.parse(
    snapshot.decks,
  );

  return {
    arkhamdbSyncToken: snapshot.id,
    decks: remoteDecks.map(mapArkhamDbDeckToManifestItem),
  };
}

function isFreshArkhamDbSnapshot(
  state: unknown,
  snapshot: ArkhamDbDeckSnapshotRow,
) {
  return (
    Date.now() - getLastArkhamDbSyncedAt(state, snapshot).getTime() <
    ARKHAMDB_SYNC_INTERVAL_MS
  );
}

function getLastArkhamDbSyncedAt(
  state: unknown,
  snapshot: ArkhamDbDeckSnapshotRow,
) {
  const parsed = ArkhamDbIdentityStateSchema.safeParse(state);
  const syncedAt = parsed.success ? parsed.data.lastSyncedAt : null;
  const date = syncedAt ? new Date(syncedAt) : snapshot.created_at;

  assert(!Number.isNaN(date.getTime()), "Invalid ArkhamDB sync timestamp.");

  return date;
}

function mapArkhamDbDeckToManifestItem(
  deck: ArkhamDbRemoteDeckManifestSource,
): DeckManifestItem {
  return {
    provider: "arkhamdb",
    id: deck.id,
    updatedAt: toArkhamDbDeckTimestamp(deck.date_update, deck.date_creation),
    version: deck.version,
  };
}

function toArkhamDbDeckTimestamp(
  primary: string | null | undefined,
  fallback: string | null | undefined,
) {
  return primary ?? fallback ?? new Date(0).toISOString();
}

async function upsertArkhamDbSnapshotDeck<E extends HonoEnv>(
  executor: ArkhamDbExecutor<E>,
  deck: ArkhamDbRemoteDeck,
) {
  await upsertArkhamDbDeckInSnapshots(
    executor.db,
    executor.connection.identity.id,
    deck,
  );
}

async function deleteArkhamDbSnapshotDeck<E extends HonoEnv>(
  executor: ArkhamDbExecutor<E>,
  deckId: string | number,
  all: boolean,
) {
  await deleteArkhamDbDeckFromSnapshots(
    executor.db,
    executor.connection.identity.id,
    deckId,
    all,
  );
}
