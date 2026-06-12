import assert from "node:assert";
import type {
  Deck,
  DeckId,
  DeckManifestItem,
  DeckWritePayload,
} from "@arkham-build/shared";
import type { Context } from "hono";
import type { Database } from "../../../db/db.ts";
import type { ArkhamdbDeckSnapshot } from "../../../db/schema.types.ts";
import { getAccountIdentityByAccountIdAndProvider } from "../../auth/account-identities.ts";
import type { SessionAuthHonoEnv } from "../../hono-env.ts";
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
  ArkhamDbRemoteDecksSchema,
} from "./core/dtos.ts";
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

    decks.push(mapArkhamDbDeckToDto(snapshotDeck));
  }

  return decks;
}

export async function fetchArkhamDbDeckManifest(
  c: Context<SessionAuthHonoEnv>,
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

  const syncedAt = new Date();

  const response = await syncDecks(
    c,
    syncedAt,
    snapshot?.last_modified ?? null,
  );

  if (response.status === 200) {
    const createdSnapshot = await createArkhamDbDeckSnapshot(
      db,
      identity.id,
      response.headers["last-modified"] ?? null,
      response.data ?? [],
    );
    const remoteDecks = ArkhamDbRemoteDecksSchema.parse(createdSnapshot.decks);

    return {
      arkhamdbSyncToken: createdSnapshot.id,
      decks: remoteDecks.map(mapArkhamDbDeckToManifestItem),
    };
  }

  assert(snapshot, "Missing ArkhamDB snapshot for 304 response.");

  const remoteDecks = ArkhamDbRemoteDecksSchema.parse(snapshot.decks);

  return {
    arkhamdbSyncToken: snapshot.id,
    decks: remoteDecks.map(mapArkhamDbDeckToManifestItem),
  };
}

export async function saveArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
  id: string | number,
  deck: DeckWritePayload,
): Promise<Deck> {
  const response = await saveDeck(c, id, deck);
  await invalidateArkhamDbDeckSnapshots(c);
  return {
    ...mapArkhamDbDeckToDto(response.data),
    xp: response.data.xp ?? deck.xp ?? null,
  };
}

export async function createArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
  deck: DeckWritePayload,
): Promise<Deck> {
  const response = await createDeck(c, deck);
  await invalidateArkhamDbDeckSnapshots(c);
  return {
    ...mapArkhamDbDeckToDto(response.data),
    xp: response.data.xp ?? deck.xp ?? null,
  };
}

export async function upgradeArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
  id: string | number,
  deck: DeckWritePayload,
): Promise<Deck> {
  const response = await upgradeDeck(c, id, deck);
  await invalidateArkhamDbDeckSnapshots(c);
  return {
    ...mapArkhamDbDeckToDto(response.data),
    xp: response.data.xp ?? 0,
  };
}

export async function deleteArkhamDbDeck(
  c: Context<SessionAuthHonoEnv>,
  deckId: string | number,
  all?: boolean,
) {
  await deleteDeck(c, deckId, all);
  await invalidateArkhamDbDeckSnapshots(c);
}

function mapArkhamDbDeckToManifestItem(
  deck: ArkhamDbRemoteDeck,
): DeckManifestItem {
  const dto = mapArkhamDbDeckToDto(deck);

  return {
    provider: "arkhamdb",
    id: dto.id,
    updatedAt: dto.date_update,
    version: dto.version,
  };
}

async function invalidateArkhamDbDeckSnapshots(c: Context<SessionAuthHonoEnv>) {
  const identity = await getAccountIdentityByAccountIdAndProvider(
    c.get("db"),
    c.get("account").id,
    "arkhamdb",
  );

  assert(identity, "Missing ArkhamDB identity for account.");

  await c
    .get("db")
    .deleteFrom("arkhamdb_deck_snapshot")
    .where("account_identity_id", "=", identity.id)
    .execute();
}

async function createArkhamDbDeckSnapshot(
  db: Database,
  accountIdentityId: string,
  lastModified: string | null,
  decks: ArkhamdbDeckSnapshot["decks"],
) {
  return await db
    .insertInto("arkhamdb_deck_snapshot")
    .values({
      account_identity_id: accountIdentityId,
      decks: JSON.stringify(decks),
      last_modified: lastModified,
    })
    .returning(["id", "decks", "last_modified"])
    .executeTakeFirstOrThrow();
}

async function findLatestArkhamDbDeckSnapshotByAccountIdentityId(
  db: Database,
  accountIdentityId: string,
) {
  return await db
    .selectFrom("arkhamdb_deck_snapshot")
    .select(["id", "decks", "last_modified"])
    .where("account_identity_id", "=", accountIdentityId)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
}

async function findArkhamDbDeckSnapshotByAccountIdAndId(
  db: Database,
  accountId: string,
  snapshotId: string,
) {
  return await db
    .selectFrom("arkhamdb_deck_snapshot")
    .innerJoin(
      "account_identity",
      "account_identity.id",
      "arkhamdb_deck_snapshot.account_identity_id",
    )
    .select([
      "arkhamdb_deck_snapshot.id",
      "arkhamdb_deck_snapshot.decks",
      "arkhamdb_deck_snapshot.last_modified",
    ])
    .where("account_identity.account_id", "=", accountId)
    .where("account_identity.provider", "=", "arkhamdb")
    .where("arkhamdb_deck_snapshot.id", "=", snapshotId)
    .executeTakeFirst();
}
