import assert from "node:assert";
import { randomUUID } from "node:crypto";
import {
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  CompleteProfileResponseSchema,
  type Deck,
} from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../../db/db.ts";
import { arkhamdbOAuthProvider } from "../../../lib/arkhamdb/oauth-provider.ts";
import { getAccountIdentityByProviderUserId } from "../../../lib/auth/account-identities.ts";
import { accountNameExists } from "../../../lib/auth/accounts.ts";
import { sessionAuth } from "../../../lib/auth/session-auth-middleware.ts";
import { setSessionCookie } from "../../../lib/auth/session-cookie.ts";
import {
  ACCOUNT_PROVIDER_TYPE,
  mapDeckRowToDto,
  mapDeckWriteDtoToInsert,
} from "../../../lib/deck-mapping.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { OAuthFlowError } from "../../../lib/oauth.ts";
import { upsertRevisionedAccountState } from "../../../lib/revisioned-account-state.ts";
import { zodValidator } from "../../../lib/validation.ts";
import {
  beginOAuthAuthorization,
  redirectToOAuthError,
} from "../lib/oauth/flow.ts";
import { getOAuthContext, validateOAuthState } from "../lib/oauth/state.ts";
import {
  completeAccountProfile,
  upsertAccountFromOAuth,
} from "../queries/accounts.ts";
import { connectOAuthIdentityToAccount } from "../queries/identities.ts";

type CompleteProfileUploads = NonNullable<CompleteProfileRequest["uploads"]>;

const routes = new Hono<HonoEnv>();

routes.post(
  "/complete-profile",
  sessionAuth({ requireCompleteProfile: false }),
  zodValidator("json", CompleteProfileRequestSchema),
  async (c) => {
    const db = c.get("db");
    const account = c.get("account");
    const payload = c.req.valid("json");

    const response = await db.transaction().execute(async (tx) => {
      if (await accountNameExists(tx, payload.username, account.id)) {
        throw new HTTPException(400, {
          message: "Username is already taken",
        });
      }

      await completeAccountProfile(tx, account.id, payload.username);
      const uploads = await applyCompleteProfileUploads(
        tx,
        account.id,
        payload.uploads,
      );

      return CompleteProfileResponseSchema.parse({ uploads });
    });

    return c.json(response);
  },
);

export const arkhamdbOAuthRoutes = new Hono<HonoEnv>();

arkhamdbOAuthRoutes.get("/", (c) =>
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/login", (c) =>
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/signup", (c) =>
  beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
    intent: "signup",
    returnTo: "/auth/signup",
  }),
);

arkhamdbOAuthRoutes.get(
  "/connect",
  sessionAuth({ requireCompleteProfile: false }),
  (c) =>
    beginOAuthAuthorization(c, arkhamdbOAuthProvider, {
      accountId: c.get("account").id,
      intent: "connect",
      returnTo: getConnectReturnTo(c.req.query("returnTo")),
    }),
);

export const arkhamdbOAuthCallbackRoutes = new Hono<HonoEnv>();
arkhamdbOAuthCallbackRoutes.get("/callback", handleArkhamDbOAuthCallback);
arkhamdbOAuthRoutes.get("/callback", handleArkhamDbOAuthCallback);

export default routes;

async function handleArkhamDbOAuthCallback(c: Context<HonoEnv>) {
  const db = c.get("db");
  const config = c.get("config");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthContext = await getOAuthContext(c);
  const returnTo = oauthContext?.returnTo ?? "/auth/login";

  try {
    if (!code) {
      throw new OAuthFlowError("oauth_missing_code");
    }

    const validatedOAuthContext = await validateOAuthState(
      c,
      arkhamdbOAuthProvider,
      state,
    );
    const accessToken = await arkhamdbOAuthProvider.exchangeCodeForToken(
      c,
      code,
    );
    const identity = await arkhamdbOAuthProvider.getIdentity(c, accessToken);

    if (validatedOAuthContext.intent === "connect") {
      assert(
        validatedOAuthContext.accountId,
        "Missing account ID for OAuth connect.",
      );

      const existingIdentity = await getAccountIdentityByProviderUserId(
        db,
        arkhamdbOAuthProvider.name,
        identity.providerUserId,
      );

      if (
        existingIdentity &&
        existingIdentity.account_id !== validatedOAuthContext.accountId
      ) {
        throw new OAuthFlowError("identity_belongs_to_another_account");
      }

      await connectOAuthIdentityToAccount(db, {
        accountId: validatedOAuthContext.accountId,
        accessToken,
        initialArkhamDbDeckSnapshot: identity.initialArkhamDbDeckSnapshot,
        provider: arkhamdbOAuthProvider.name,
        providerUserId: identity.providerUserId,
      });

      return c.redirect(
        `${config.FRONTEND_URL}${validatedOAuthContext.returnTo}`,
      );
    }

    const { existing, session } = await upsertAccountFromOAuth(db, {
      accessToken,
      config,
      initialArkhamDbDeckSnapshot: identity.initialArkhamDbDeckSnapshot,
      provider: arkhamdbOAuthProvider.name,
      providerUserId: identity.providerUserId,
    });

    setSessionCookie(c, session.token);
    const path = existing ? "/" : "/auth/signup/complete";
    return c.redirect(`${config.FRONTEND_URL}${path}`);
  } catch (error) {
    return redirectToOAuthError(c, returnTo, error);
  }
}

async function applyCompleteProfileUploads(
  db: Database,
  accountId: string,
  uploads: CompleteProfileRequest["uploads"],
) {
  if (!uploads) return undefined;

  const deckUpload = await uploadAccountDecks(db, accountId, uploads.decks);
  const folders = await uploadFolders(
    db,
    accountId,
    uploads.folders,
    deckUpload.deckIdMap,
  );
  const settings = await uploadSettings(db, accountId, uploads.settings);
  const cardTags = await uploadCardTags(db, accountId, uploads.cardTags);

  return {
    cardTags,
    deckIdMap: deckUpload.deckIdMap,
    decks: deckUpload.decks,
    folders,
    settings,
  };
}

async function uploadAccountDecks(
  db: Database,
  accountId: string,
  decks: Deck[] | undefined,
) {
  if (!decks?.length) return {};

  assertUniqueUploadedDeckIds(decks);

  const deckIdMap = await createDeckIdMap(db, decks);
  const remappedDecks = decks.map((deck) => remapDeck(deck, deckIdMap));

  const rows = await db
    .insertInto("deck")
    .values(
      remappedDecks.map((deck) => {
        const {
          date_creation,
          date_update,
          id,
          source: _,
          version,
          ...deckPayload
        } = deck;
        const now = new Date();

        return {
          ...mapDeckWriteDtoToInsert(deckPayload),
          account_id: accountId,
          created_at: parseUploadedDeckTimestamp(date_creation, now),
          id: String(id),
          provider_type: ACCOUNT_PROVIDER_TYPE,
          updated_at: parseUploadedDeckTimestamp(date_update, now),
          version,
        };
      }),
    )
    .returningAll()
    .execute();

  return {
    deckIdMap,
    decks: rows.map(mapDeckRowToDto),
  };
}

async function uploadFolders(
  db: Database,
  accountId: string,
  folders: CompleteProfileUploads["folders"],
  deckIdMap: Record<string, string> | undefined,
) {
  if (!folders) return undefined;

  const row = await upsertRevisionedAccountState(db, {
    accountId,
    expectedRevision: null,
    revision: randomUUID(),
    state: remapFolderState(folders, deckIdMap),
    table: "account_folder",
  });
  const folderState =
    row ?? (await findExistingAccountFolderState(db, accountId));

  assert(
    folderState,
    "Folder state should exist after new account onboarding.",
  );

  return {
    revision: folderState.revision,
    state: folderState.state,
  };
}

async function createDeckIdMap(db: Database, decks: Deck[]) {
  const deckIds = decks.map((deck) => String(deck.id));
  const existingDecks = await db
    .selectFrom("deck")
    .select(["id"])
    .where("id", "in", deckIds)
    .execute();

  const existingIds = new Set(existingDecks.map((deck) => deck.id));
  const reservedIds = new Set(deckIds);
  const deckIdMap: Record<string, string> = {};

  for (const id of deckIds) {
    deckIdMap[id] = existingIds.has(id)
      ? await createUniqueDeckId(db, reservedIds)
      : id;
  }

  return deckIdMap;
}

async function createUniqueDeckId(db: Database, reservedIds: Set<string>) {
  let id = randomUUID();

  while (reservedIds.has(id) || (await deckIdExists(db, id))) {
    id = randomUUID();
  }

  reservedIds.add(id);
  return id;
}

async function deckIdExists(db: Database, id: string) {
  return !!(await db
    .selectFrom("deck")
    .select(["id"])
    .where("id", "=", id)
    .executeTakeFirst());
}

function assertUniqueUploadedDeckIds(decks: Deck[]) {
  const ids = new Set<string>();

  for (const deck of decks) {
    const id = String(deck.id);

    if (ids.has(id)) {
      throw new HTTPException(400, {
        message: "Uploaded decks must have unique ids",
      });
    }

    ids.add(id);
  }
}

function parseUploadedDeckTimestamp(value: string, fallback: Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function remapDeck(deck: Deck, deckIdMap: Record<string, string>): Deck {
  const id = deckIdMap[String(deck.id)];
  assert(id, `Missing mapped id for deck ${String(deck.id)}.`);

  return {
    ...deck,
    id,
    next_deck: remapDeckReference(deck.next_deck, deckIdMap),
    previous_deck: remapDeckReference(deck.previous_deck, deckIdMap),
    source: "account",
  };
}

function remapDeckReference(
  id: string | number | null | undefined,
  deckIdMap: Record<string, string>,
) {
  if (id == null) return null;

  const mappedId = deckIdMap[String(id)];

  if (!mappedId) {
    throw new HTTPException(400, {
      message: "Uploaded deck chains must include all referenced decks",
    });
  }

  return mappedId;
}

function remapFolderState(
  folders: CompleteProfileUploads["folders"],
  deckIdMap: Record<string, string> | undefined,
) {
  assert(folders, "Missing folder state.");

  const deckFolders: NonNullable<
    CompleteProfileUploads["folders"]
  >["deckFolders"] = {};

  for (const [deckId, folderId] of Object.entries(folders.deckFolders)) {
    const mappedDeckId = deckIdMap?.[deckId];

    if (mappedDeckId) {
      deckFolders[mappedDeckId] = folderId;
    }
  }

  return {
    ...folders,
    deckFolders,
  };
}

async function uploadSettings(
  db: Database,
  accountId: string,
  settings: CompleteProfileUploads["settings"],
) {
  if (!settings) return undefined;

  const row = await upsertRevisionedAccountState(db, {
    accountId,
    collection: settings.collection,
    expectedRevision: null,
    revision: randomUUID(),
    settings: settings.settings,
    table: "account_settings",
  });
  const accountSettings =
    row ?? (await findExistingAccountSettings(db, accountId));

  assert(
    accountSettings,
    "Settings should exist after new account onboarding.",
  );

  return {
    collection: accountSettings.collection,
    revision: accountSettings.revision,
    settings: accountSettings.settings,
  };
}

async function uploadCardTags(
  db: Database,
  accountId: string,
  cardTags: CompleteProfileUploads["cardTags"],
) {
  if (!cardTags) return undefined;

  const row = await upsertRevisionedAccountState(db, {
    accountId,
    expectedRevision: null,
    revision: randomUUID(),
    state: cardTags,
    table: "account_card_tag",
  });
  const accountCardTags =
    row ?? (await findExistingAccountCardTags(db, accountId));

  assert(
    accountCardTags,
    "Card tags should exist after new account onboarding.",
  );

  return {
    revision: accountCardTags.revision,
    state: accountCardTags.state,
  };
}

async function findExistingAccountCardTags(db: Database, accountId: string) {
  return await db
    .selectFrom("account_card_tag")
    .select(["revision", "state"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

async function findExistingAccountFolderState(db: Database, accountId: string) {
  return await db
    .selectFrom("account_folder")
    .select(["revision", "state"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

async function findExistingAccountSettings(db: Database, accountId: string) {
  return await db
    .selectFrom("account_settings")
    .select(["collection", "revision", "settings"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

function getConnectReturnTo(returnTo: string | undefined) {
  if (!returnTo) {
    return "/settings?tab=account";
  }

  if (!returnTo.startsWith("/")) {
    throw new HTTPException(400, { message: "Invalid returnTo" });
  }

  const url = new URL(returnTo, "http://internal");

  if (url.origin !== "http://internal") {
    throw new HTTPException(400, { message: "Invalid returnTo" });
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
