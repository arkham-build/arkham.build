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
import type { SessionAuthHonoEnv } from "../../hono-env.ts";
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

export async function fetchArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
  id: string | number,
) {
  const response = await fetchDeck(c, id);
  return mapArkhamDbDeckToDto(response.data);
}

export async function fetchArkhamDbDeckBatch(
  c: Context<SessionAuthHonoEnv>,
  ids: DeckId[],
  arkhamdbSyncToken?: string,
) {
  const snapshot = arkhamdbSyncToken
    ? await findArkhamDbDeckSnapshotByAccountIdAndId(
        c.get("db"),
        c.get("account").id,
        arkhamdbSyncToken,
      )
    : undefined;

  if (!arkhamdbSyncToken) {
    const decks: Deck[] = [];

    for (const id of ids) {
      decks.push(await fetchArkhamDbDeck(c, id));
    }

    return decks;
  }

  const snapshotDecks = ArkhamDbRemoteDecksSchema.parse(snapshot?.decks ?? []);

  const snapshotDecksById = new Map(
    snapshotDecks.map((deck) => [String(deck.id), deck]),
  );

  const decks: Deck[] = [];

  for (const id of ids) {
    const snapshotDeck = snapshotDecksById.get(String(id));

    if (!snapshotDeck) {
      throw new Error(`Deck ${id} not found in snapshot.`);
    }

    decks.push(
      mapArkhamDbDeckToDto(
        await mergeAdditionalMeta(c.get("db"), snapshotDeck, {
          legacyApiBaseUrl: c.get("config").LEGACY_API_BASE_URL,
        }),
      ),
    );
  }

  return decks;
}

export async function fetchArkhamDbDeckManifest(
  c: Context<SessionAuthHonoEnv>,
  opts: { force?: boolean } = {},
): Promise<{ arkhamdbSyncToken: string; decks: DeckManifestItem[] }> {
  const db = c.get("db");
  const accountId = c.get("account").id;

  const identity = await getAccountIdentityByAccountIdAndProvider(
    db,
    accountId,
    "arkhamdb",
  );

  assert(identity, "Missing ArkhamDB identity for account.");

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

export async function saveArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
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

export async function createArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
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

export async function upgradeArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
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

export async function deleteArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
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
  return primary ?? fallback ?? new Date().toISOString();
}

async function upsertArkhamDbSnapshotDeck(
  executor: ArkhamDbExecutor,
  deck: ArkhamDbRemoteDeck,
) {
  await upsertArkhamDbDeckInSnapshots(
    executor.db,
    executor.connection.identity.id,
    deck,
  );
}

async function deleteArkhamDbSnapshotDeck(
  executor: ArkhamDbExecutor,
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
