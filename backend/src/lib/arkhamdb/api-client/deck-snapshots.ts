import type { Transaction } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { ArkhamdbDeckSnapshot, DB } from "../../../db/schema.types.ts";
import {
  type ArkhamDbRemoteDeck,
  ArkhamDbRemoteDecksSchema,
} from "./core/dtos.ts";

export async function createArkhamDbDeckSnapshot(
  db: SnapshotDatabase,
  accountIdentityId: string,
  lastModified: string | null,
  decks: ArkhamdbDeckSnapshot["decks"],
) {
  return await withArkhamDbDeckSnapshotLock(
    db,
    accountIdentityId,
    async (tx) =>
      await insertArkhamDbDeckSnapshot(
        tx,
        accountIdentityId,
        lastModified,
        decks,
      ),
  );
}

export async function upsertArkhamDbDeckInSnapshots(
  db: Database,
  accountIdentityId: string,
  deck: ArkhamDbRemoteDeck,
) {
  await createPatchedArkhamDbDeckSnapshotByAccountIdentityId(
    db,
    accountIdentityId,
    (decks) => {
      let found = false;

      const nextDecks = decks.map((item) => {
        if (sameDeckId(item.id, deck.id)) {
          found = true;
          return deck;
        }

        if (
          deck.previous_deck != null &&
          sameDeckId(item.id, deck.previous_deck)
        ) {
          return { ...item, next_deck: deck.id };
        }

        if (deck.next_deck != null && sameDeckId(item.id, deck.next_deck)) {
          return { ...item, previous_deck: deck.id };
        }

        return item;
      });

      if (!found) {
        nextDecks.push(deck);
      }

      return nextDecks;
    },
  );
}

export async function deleteArkhamDbDeckFromSnapshots(
  db: Database,
  accountIdentityId: string,
  deckId: string | number,
  all = false,
) {
  await createPatchedArkhamDbDeckSnapshotByAccountIdentityId(
    db,
    accountIdentityId,
    (decks) => {
      const deletedDeckIds = new Set([String(deckId)]);

      if (all) {
        const decksById = new Map(decks.map((deck) => [String(deck.id), deck]));
        let deck = decksById.get(String(deckId));

        while (deck?.previous_deck != null) {
          const previousId = String(deck.previous_deck);
          if (deletedDeckIds.has(previousId)) break;

          deletedDeckIds.add(previousId);
          deck = decksById.get(previousId);
        }
      }

      const deletedDeck = decks.find((deck) => sameDeckId(deck.id, deckId));

      return decks.reduce<ArkhamDbRemoteDeck[]>((acc, deck) => {
        if (deletedDeckIds.has(String(deck.id))) return acc;

        if (
          !all &&
          deletedDeck?.previous_deck != null &&
          sameDeckId(deck.id, deletedDeck.previous_deck)
        ) {
          acc.push({ ...deck, next_deck: null });
          return acc;
        }

        acc.push(deck);
        return acc;
      }, []);
    },
  );
}

export async function findLatestArkhamDbDeckSnapshotByAccountIdentityId(
  db: Database,
  accountIdentityId: string,
) {
  return await db
    .selectFrom("arkhamdb_deck_snapshot")
    .select(["id", "created_at", "decks", "last_modified"])
    .where("account_identity_id", "=", accountIdentityId)
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .executeTakeFirst();
}

export async function findArkhamDbDeckSnapshotByAccountIdAndId(
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
      "arkhamdb_deck_snapshot.created_at",
      "arkhamdb_deck_snapshot.decks",
      "arkhamdb_deck_snapshot.last_modified",
    ])
    .where("account_identity.account_id", "=", accountId)
    .where("account_identity.provider", "=", "arkhamdb")
    .where("arkhamdb_deck_snapshot.id", "=", snapshotId)
    .executeTakeFirst();
}

type SnapshotDatabase = Database | Transaction<DB>;
type SnapshotPatch = (decks: ArkhamDbRemoteDeck[]) => ArkhamDbRemoteDeck[];

const ARKHAMDB_DECK_SNAPSHOT_RETENTION = 3;

async function createPatchedArkhamDbDeckSnapshotByAccountIdentityId(
  db: Database,
  accountIdentityId: string,
  patch: SnapshotPatch,
) {
  await withArkhamDbDeckSnapshotLock(db, accountIdentityId, async (tx) => {
    const snapshot = await tx
      .selectFrom("arkhamdb_deck_snapshot")
      .select(["decks", "last_modified"])
      .where("account_identity_id", "=", accountIdentityId)
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .executeTakeFirst();

    if (!snapshot) return;

    const decks = ArkhamDbRemoteDecksSchema.parse(snapshot.decks ?? []);
    const patchedDecks = patch(decks);

    await insertArkhamDbDeckSnapshot(
      tx,
      accountIdentityId,
      snapshot.last_modified,
      patchedDecks,
    );
  });
}

async function withArkhamDbDeckSnapshotLock<T>(
  db: SnapshotDatabase,
  accountIdentityId: string,
  run: (tx: SnapshotDatabase) => Promise<T>,
) {
  if (db.isTransaction) {
    await lockArkhamDbDeckSnapshotAccountIdentity(db, accountIdentityId);
    return await run(db);
  }

  return await db.transaction().execute(async (tx) => {
    await lockArkhamDbDeckSnapshotAccountIdentity(tx, accountIdentityId);
    return await run(tx);
  });
}

async function lockArkhamDbDeckSnapshotAccountIdentity(
  db: SnapshotDatabase,
  accountIdentityId: string,
) {
  await db
    .selectFrom("account_identity")
    .select("id")
    .where("id", "=", accountIdentityId)
    .forUpdate()
    .executeTakeFirstOrThrow();
}

async function insertArkhamDbDeckSnapshot(
  db: SnapshotDatabase,
  accountIdentityId: string,
  lastModified: string | null,
  decks: ArkhamdbDeckSnapshot["decks"],
) {
  const snapshot = await db
    .insertInto("arkhamdb_deck_snapshot")
    .values({
      account_identity_id: accountIdentityId,
      created_at: new Date(),
      decks: JSON.stringify(decks),
      last_modified: lastModified,
    })
    .returning(["id", "created_at", "decks", "last_modified"])
    .executeTakeFirstOrThrow();

  await pruneArkhamDbDeckSnapshotsByAccountIdentityId(db, accountIdentityId);

  return snapshot;
}

async function pruneArkhamDbDeckSnapshotsByAccountIdentityId(
  db: SnapshotDatabase,
  accountIdentityId: string,
) {
  const expiredSnapshots = await db
    .selectFrom("arkhamdb_deck_snapshot")
    .select("id")
    .where("account_identity_id", "=", accountIdentityId)
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .offset(ARKHAMDB_DECK_SNAPSHOT_RETENTION)
    .execute();

  if (!expiredSnapshots.length) return;

  await db
    .deleteFrom("arkhamdb_deck_snapshot")
    .where(
      "id",
      "in",
      expiredSnapshots.map((snapshot) => snapshot.id),
    )
    .execute();
}

function sameDeckId(a: string | number, b: string | number) {
  return String(a) === String(b);
}
