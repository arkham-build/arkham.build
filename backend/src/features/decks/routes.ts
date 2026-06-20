import assert from "node:assert";
import { createHash } from "node:crypto";
import {
  DeckBatchRequestSchema,
  DeckBatchResponseSchema,
  DeckConflictResponseSchema,
  type DeckDeleteRequest,
  DeckDeleteRequestSchema,
  type DeckManifestItem,
  DeckManifestItemSchema,
  DeckManifestResponseSchema,
  DeckSchema,
  type DeckSyncTarget,
  type DeckUpdateRequest,
  DeckUpdateRequestSchema,
  type DeckUpgradeRequest,
  DeckUpgradeRequestSchema,
  type Deck as SharedDeck,
  type SyncedDeckProvider,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import { ApiError } from "../../lib/arkhamdb/api-client/core/errors.ts";
import { ARKHAMDB_PROVIDER_TYPE } from "../../lib/arkhamdb/api-client/mapping.ts";
import {
  createArkhamDbDeck,
  deleteArkhamDbDeck,
  fetchArkhamDbDeck,
  fetchArkhamDbDeckBatch,
  fetchArkhamDbDeckManifest,
  saveArkhamDbDeck,
  upgradeArkhamDbDeck,
} from "../../lib/arkhamdb/api-client/user-service.ts";
import { getAccountIdentityByAccountIdAndProvider } from "../../lib/auth/account-identities.ts";
import { sessionAuth } from "../../lib/auth/session-auth-middleware.ts";
import {
  ACCOUNT_PROVIDER_TYPE,
  mapDeckRowToDto,
  mapDeckWriteDtoToInsert,
} from "../../lib/deck-mapping.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { zodValidator } from "../../lib/validation.ts";
import {
  findAccountDeckById,
  listAccountDecksByIds,
  listAccountDecksForManifest,
} from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/manifest", sessionAuth(), async (c) => {
  const db = c.get("db");
  const accountId = c.get("account").id;

  const arkhamdbIdentity = await getAccountIdentityByAccountIdAndProvider(
    db,
    accountId,
    "arkhamdb",
  );

  let arkhamdbDeckManifest: DeckManifestItem[] = [];
  let arkhamdbSyncToken: string | null = null;
  let arkhamdbAvailable = false;

  if (arkhamdbIdentity) {
    try {
      const remoteManifest = await fetchArkhamDbDeckManifest(c);
      arkhamdbDeckManifest = remoteManifest.decks;
      arkhamdbSyncToken = remoteManifest.arkhamdbSyncToken;
      arkhamdbAvailable = true;
    } catch (error) {
      if (!isArkhamDbManifestUnavailableError(error)) {
        throw error;
      }

      c.get("logger")("warn", "ArkhamDB deck manifest unavailable", {
        accountId,
        error: error.message,
        ...(error instanceof ApiError ? { status: error.status } : {}),
      });
    }
  }

  const accountDecks = await listAccountDecksForManifest(db, accountId);

  const accountDeckManifest = accountDecks.map((deck) =>
    DeckManifestItemSchema.parse({
      provider: ACCOUNT_PROVIDER_TYPE,
      id: deck.id,
      updatedAt: deck.updated_at.toISOString(),
      version: deck.version ?? "",
    }),
  );

  const decks = [...accountDeckManifest, ...arkhamdbDeckManifest];

  const manifest = DeckManifestResponseSchema.parse({
    version: createDeckManifestVersion(decks),
    decks,
    arkhamdbSyncToken,
    providers: {
      account: { available: true },
      arkhamdb: { available: arkhamdbAvailable },
    },
  });

  return c.json(manifest);
});

routes.post(
  "/batch",
  sessionAuth(),
  zodValidator("json", DeckBatchRequestSchema),
  async (c) => {
    const { arkhamdbSyncToken, targets } = c.req.valid("json");

    const accountIds = targets
      .filter((target) => target.provider === ACCOUNT_PROVIDER_TYPE)
      .map((target) => String(target.id));
    const arkhamdbIds = targets
      .filter((target) => target.provider === ARKHAMDB_PROVIDER_TYPE)
      .map((target) => target.id);

    const accountDecks = await listAccountDecksByIds(
      c.get("db"),
      c.get("account").id,
      accountIds,
    );

    const decksById = new Map(
      accountDecks.map((deck) => [
        getDeckTargetKey({ provider: ACCOUNT_PROVIDER_TYPE, id: deck.id }),
        mapDeckRowToDto(deck),
      ]),
    );

    if (arkhamdbIds.length) {
      const arkhamdbDecks = await fetchArkhamDbDeckBatch(
        c,
        arkhamdbIds,
        arkhamdbSyncToken ?? undefined,
      );

      for (const deck of arkhamdbDecks) {
        decksById.set(
          getDeckTargetKey({ provider: ARKHAMDB_PROVIDER_TYPE, id: deck.id }),
          deck,
        );
      }
    }

    return c.json(
      DeckBatchResponseSchema.parse(
        targets.map((target) => {
          const deck = decksById.get(getDeckTargetKey(target));
          assert(
            deck,
            `Missing deck ${target.provider}:${String(target.id)} in batch response.`,
          );
          return deck;
        }),
      ),
    );
  },
);

routes.post("/", sessionAuth(), zodValidator("json", DeckSchema), async (c) => {
  const payload = c.req.valid("json");

  assertDeckCanBeUploaded(payload);

  const deck =
    payload.source === ARKHAMDB_PROVIDER_TYPE
      ? await arkhamdbCrud.create(c, payload)
      : await localCrud.create(c, payload);

  return c.json(DeckSchema.parse(deck));
});

routes.put(
  "/:id",
  sessionAuth(),
  zodValidator("json", DeckUpdateRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const deckId = c.req.param("id");

    assertMatchingDeckId(deckId, payload.id);

    const deck = await getCrud(payload.source).update(c, deckId, payload);

    return c.json(DeckSchema.parse(deck));
  },
);

routes.delete(
  "/:id",
  sessionAuth(),
  zodValidator("json", DeckDeleteRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const deckId = c.req.param("id");

    await getCrud(payload.provider).delete(c, deckId, payload);

    return new Response(null, { status: 204 });
  },
);

routes.post(
  "/upgrade/:id",
  sessionAuth(),
  zodValidator("json", DeckUpgradeRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const previousDeckId = c.req.param("id");

    assertUpgradeTargetDiffers(previousDeckId, payload.deck.id);

    const deck = await getCrud(payload.provider).upgrade(
      c,
      previousDeckId,
      payload,
    );

    return c.json(DeckSchema.parse(deck));
  },
);

export default routes;

type DeckContext = Parameters<typeof fetchArkhamDbDeck>[0];

function getDeckTargetKey(target: DeckSyncTarget) {
  return `${target.provider}:${String(target.id)}`;
}

function getCrud(provider: SyncedDeckProvider) {
  return provider === ARKHAMDB_PROVIDER_TYPE ? arkhamdbCrud : localCrud;
}

function isArkhamDbManifestUnavailableError(error: unknown): error is Error {
  return (
    error instanceof ApiError ||
    (error instanceof Error &&
      error.message === "Missing ArkhamDB identity or OAuth token for account.")
  );
}

function assertDeckCanBeUploaded(deck: SharedDeck) {
  if (deck.previous_deck) {
    throw new HTTPException(400, {
      message: "Upgraded decks cannot be uploaded to a synced provider",
    });
  }
}

const localCrud = {
  async create(c: DeckContext, payload: SharedDeck) {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const { id, source: _, version, ...deckPayload } = payload;

    const deck = await db
      .insertInto("deck")
      .values({
        ...mapDeckWriteDtoToInsert(deckPayload),
        account_id: accountId,
        id: String(id),
        provider_type: ACCOUNT_PROVIDER_TYPE,
        version,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapDeckRowToDto(deck);
  },

  async update(c: DeckContext, deckId: string, payload: DeckUpdateRequest) {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const { expectedVersion: _, id: __, version, ...deckPayload } = payload;

    const deck = await db
      .updateTable("deck")
      .set({
        ...mapDeckWriteDtoToInsert(deckPayload),
        updated_at: new Date(),
        version,
      })
      .where("account_id", "=", accountId)
      .where("id", "=", deckId)
      .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
      .where((eb) =>
        payload.expectedVersion === ""
          ? eb.or([eb("version", "is", null), eb("version", "=", "")])
          : eb("version", "=", payload.expectedVersion),
      )
      .returningAll()
      .executeTakeFirst();

    if (deck) {
      return mapDeckRowToDto(deck);
    }

    return await throwCurrentLocalDeckConflict(db, accountId, deckId);
  },

  async delete(c: DeckContext, deckId: string, payload: DeckDeleteRequest) {
    const db = c.get("db");
    const accountId = c.get("account").id;

    const deleted = await db
      .deleteFrom("deck")
      .where("account_id", "=", accountId)
      .where("id", "=", deckId)
      .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
      .where((eb) =>
        payload.expectedVersion === ""
          ? eb.or([eb("version", "is", null), eb("version", "=", "")])
          : eb("version", "=", payload.expectedVersion),
      )
      .returning(["id"])
      .executeTakeFirst();

    if (deleted) {
      return;
    }

    await throwCurrentLocalDeckConflict(db, accountId, deckId);
  },

  async upgrade(
    c: DeckContext,
    previousDeckId: string,
    payload: DeckUpgradeRequest,
  ) {
    const db = c.get("db");
    const accountId = c.get("account").id;
    const { deck, expectedVersion } = payload;

    const nextDeck = await db.transaction().execute(async (tx) => {
      const lockedCurrent = await tx
        .selectFrom("deck")
        .selectAll()
        .where("account_id", "=", accountId)
        .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
        .where("id", "=", previousDeckId)
        .forUpdate()
        .executeTakeFirst();

      if (!lockedCurrent) {
        throwDeckConflict(null, null);
      }

      const current = mapDeckRowToDto(lockedCurrent);
      const currentVersion = lockedCurrent.version ?? null;
      assertExpectedDeckVersion(current, expectedVersion, currentVersion);
      assertDeckHasNoUpgrade(current, currentVersion);

      const { id, source: _, version, ...deckPayload } = deck;
      const createdDeckId = String(id);

      const createdDeck = await tx
        .insertInto("deck")
        .values({
          ...mapDeckWriteDtoToInsert({
            ...deckPayload,
            next_deck: null,
            previous_deck: lockedCurrent.id,
          }),
          account_id: accountId,
          id: createdDeckId,
          provider_type: ACCOUNT_PROVIDER_TYPE,
          version,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await tx
        .updateTable("deck")
        .set({ next_deck: createdDeckId, updated_at: new Date() })
        .where("id", "=", lockedCurrent.id)
        .executeTakeFirst();

      return createdDeck;
    });

    return mapDeckRowToDto(nextDeck);
  },
};

const arkhamdbCrud = {
  create(c: DeckContext, payload: SharedDeck) {
    return createArkhamDbDeck(c, payload);
  },

  async update(c: DeckContext, deckId: string, payload: DeckUpdateRequest) {
    await fetchMatchingArkhamDbDeck(c, deckId, payload.expectedVersion);
    return await saveArkhamDbDeck(c, deckId, payload);
  },

  async delete(c: DeckContext, deckId: string, payload: DeckDeleteRequest) {
    await fetchMatchingArkhamDbDeck(c, deckId, payload.expectedVersion);
    await deleteArkhamDbDeck(c, deckId);
  },

  async upgrade(
    c: DeckContext,
    previousDeckId: string,
    payload: DeckUpgradeRequest,
  ) {
    const current = await fetchMatchingArkhamDbDeck(
      c,
      previousDeckId,
      payload.expectedVersion,
    );

    assertDeckHasNoUpgrade(current);

    const currentCarryoverXp =
      (current.xp ?? 0) +
      (current.xp_adjustment ?? 0) -
      (current.xp_spent ?? 0);

    const upgradeXp = Math.max((payload.deck.xp ?? 0) - currentCarryoverXp, 0);

    return await upgradeArkhamDbDeck(c, previousDeckId, {
      ...payload.deck,
      exile_string: payload.deck.exile_string,
      meta: payload.deck.meta,
      xp: upgradeXp,
    });
  },
};

function assertMatchingDeckId(routeId: string, payloadId: SharedDeck["id"]) {
  if (String(payloadId) !== routeId) {
    throw new HTTPException(400, {
      message: "Deck id in request body must match route parameter",
    });
  }
}

function assertUpgradeTargetDiffers(
  previousDeckId: string,
  nextDeckId: SharedDeck["id"],
) {
  if (String(nextDeckId) === previousDeckId) {
    throw new HTTPException(400, {
      message: "Upgraded deck id must differ from previous deck id",
    });
  }
}

async function throwCurrentLocalDeckConflict(
  db: Database,
  accountId: string,
  deckId: string,
) {
  const current = await findAccountDeckById(db, accountId, deckId);
  throwDeckConflict(
    current ? mapDeckRowToDto(current) : null,
    current?.version ?? null,
  );
}

async function fetchMatchingArkhamDbDeck(
  c: DeckContext,
  id: string,
  expectedVersion: string,
) {
  const current = await fetchArkhamDbDeckOrNull(c, id);

  if (!current) {
    throwDeckConflict(null, null);
  }

  assertExpectedDeckVersion(current, expectedVersion);
  return current;
}

function assertExpectedDeckVersion(
  deck: SharedDeck,
  expectedVersion: string,
  remoteVersion: string | null = deck.version,
) {
  if (deck.version !== expectedVersion) {
    throwDeckConflict(deck, remoteVersion);
  }
}

function assertDeckHasNoUpgrade(
  deck: SharedDeck,
  remoteVersion: string | null = deck.version,
) {
  if (deck.next_deck) {
    throwDeckConflict(deck, remoteVersion, "Deck already has an upgrade");
  }
}

async function fetchArkhamDbDeckOrNull(c: DeckContext, id: string) {
  try {
    return await fetchArkhamDbDeck(c, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

function throwDeckConflict(
  remoteDeck: SharedDeck | null,
  remoteVersion: string | null,
  message = "Stored deck version does not match the expected version",
): never {
  throw new HTTPException(409, {
    message,
    cause: DeckConflictResponseSchema.parse({
      remoteDeck,
      remoteVersion,
    }),
  });
}

function createDeckManifestVersion(
  decks: Array<{ id: string | number; updatedAt: string; version: string }>,
) {
  const hash = createHash("sha256");

  for (const item of decks) {
    hash.update(`${item.id}:${item.version}:${item.updatedAt}`);
  }

  return hash.digest("hex");
}
