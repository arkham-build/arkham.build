import type { Selectable, Transaction } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { DB, OauthClient } from "../../../db/schema.types.ts";
import { isEmpty } from "../../../lib/is-empty.ts";

const SAFE_CLIENT_COLUMNS = [
  "id",
  "name",
  "disabled_at",
  "created_at",
  "updated_at",
] as const;

type SafeClientRow = Pick<
  Selectable<OauthClient>,
  (typeof SAFE_CLIENT_COLUMNS)[number]
>;

export type OAuthClientDetails = SafeClientRow & {
  redirect_uris: string[];
};

export type OAuthClientPatch = {
  name?: string | undefined;
  redirectUris?: readonly string[] | undefined;
};

export async function createOAuthClient(
  db: Database,
  input: {
    id: string;
    name: string;
    redirectUris: readonly string[];
    secretHash: string;
  },
) {
  return await db.transaction().execute(async (tx) => {
    const client = await tx
      .insertInto("oauth_client")
      .values({
        id: input.id,
        name: input.name,
        secret_hash: input.secretHash,
      })
      .returning(SAFE_CLIENT_COLUMNS)
      .executeTakeFirstOrThrow();

    await tx
      .insertInto("oauth_client_redirect_uri")
      .values(
        input.redirectUris.map((redirectUri) => ({
          oauth_client_id: input.id,
          redirect_uri: redirectUri,
        })),
      )
      .execute();

    return withRedirectUris(client, input.redirectUris);
  });
}

export async function listOAuthClients(db: Database) {
  const clients = await db
    .selectFrom("oauth_client")
    .select(SAFE_CLIENT_COLUMNS)
    .orderBy("created_at", "desc")
    .orderBy("id")
    .execute();

  if (isEmpty(clients)) return [];

  const redirectUris = await db
    .selectFrom("oauth_client_redirect_uri")
    .select(["oauth_client_id", "redirect_uri"])
    .where(
      "oauth_client_id",
      "in",
      clients.map((client) => client.id),
    )
    .orderBy("redirect_uri")
    .execute();
  const redirectUrisByClientId = new Map<string, string[]>();

  for (const redirectUri of redirectUris) {
    const clientRedirectUris =
      redirectUrisByClientId.get(redirectUri.oauth_client_id) ?? [];
    clientRedirectUris.push(redirectUri.redirect_uri);
    redirectUrisByClientId.set(redirectUri.oauth_client_id, clientRedirectUris);
  }

  return clients.map((client) =>
    withRedirectUris(client, redirectUrisByClientId.get(client.id) ?? []),
  );
}

export async function findOAuthClientById(db: Database, clientId: string) {
  const client = await db
    .selectFrom("oauth_client")
    .select(SAFE_CLIENT_COLUMNS)
    .where("id", "=", clientId)
    .executeTakeFirst();

  if (!client) return undefined;

  return withRedirectUris(client, await listRedirectUris(db, clientId));
}

export async function updateOAuthClient(
  db: Database,
  clientId: string,
  patch: OAuthClientPatch,
) {
  return await db.transaction().execute(async (tx) => {
    const client = await lockOAuthClient(tx, clientId);
    if (!client) return undefined;

    const currentRedirectUris = await listRedirectUris(tx, clientId);
    const now = new Date();
    const updatedClient = await tx
      .updateTable("oauth_client")
      .set(
        !patch.name
          ? { updated_at: now }
          : { name: patch.name, updated_at: now },
      )
      .where("id", "=", clientId)
      .returning(SAFE_CLIENT_COLUMNS)
      .executeTakeFirstOrThrow();

    if (!patch.redirectUris) {
      return withRedirectUris(updatedClient, currentRedirectUris);
    }

    const nextRedirectUriSet = new Set(patch.redirectUris);
    const removedRedirectUris = currentRedirectUris.filter(
      (redirectUri) => !nextRedirectUriSet.has(redirectUri),
    );

    await invalidateRemovedRedirectUris(tx, clientId, removedRedirectUris, now);
    await tx
      .deleteFrom("oauth_client_redirect_uri")
      .where("oauth_client_id", "=", clientId)
      .execute();
    await tx
      .insertInto("oauth_client_redirect_uri")
      .values(
        patch.redirectUris.map((redirectUri) => ({
          oauth_client_id: clientId,
          redirect_uri: redirectUri,
        })),
      )
      .execute();

    return withRedirectUris(updatedClient, patch.redirectUris);
  });
}

export async function setOAuthClientDisabled(
  db: Database,
  clientId: string,
  disabled: boolean,
) {
  return await db.transaction().execute(async (tx) => {
    const client = await lockOAuthClient(tx, clientId);
    if (!client) return undefined;

    const isDisabled = client.disabled_at != null;
    if (isDisabled === disabled) {
      return withRedirectUris(client, await listRedirectUris(tx, clientId));
    }

    const now = new Date();
    const updatedClient = await tx
      .updateTable("oauth_client")
      .set({
        disabled_at: disabled ? now : null,
        updated_at: now,
      })
      .where("id", "=", clientId)
      .returning(SAFE_CLIENT_COLUMNS)
      .executeTakeFirstOrThrow();

    return withRedirectUris(
      updatedClient,
      await listRedirectUris(tx, clientId),
    );
  });
}

export async function rotateOAuthClientSecret(
  db: Database,
  clientId: string,
  secretHash: string,
) {
  return await db.transaction().execute(async (tx) => {
    const client = await lockOAuthClient(tx, clientId);
    if (!client) return undefined;

    const now = new Date();
    const updatedClient = await tx
      .updateTable("oauth_client")
      .set({ secret_hash: secretHash, updated_at: now })
      .where("id", "=", clientId)
      .returning(SAFE_CLIENT_COLUMNS)
      .executeTakeFirstOrThrow();
    const grantIds = tx
      .selectFrom("oauth_grant")
      .select("id")
      .where("oauth_client_id", "=", clientId);

    await tx
      .updateTable("oauth_access_token")
      .set({ revoked_at: now, updated_at: now })
      .where("oauth_grant_id", "in", grantIds)
      .where("revoked_at", "is", null)
      .execute();
    await tx
      .updateTable("oauth_refresh_token")
      .set({ revoked_at: now, updated_at: now })
      .where("oauth_grant_id", "in", grantIds)
      .where("revoked_at", "is", null)
      .execute();
    await tx
      .updateTable("oauth_authorization_code")
      .set({ revoked_at: now, updated_at: now })
      .where("oauth_grant_id", "in", grantIds)
      .where("used_at", "is", null)
      .where("revoked_at", "is", null)
      .execute();
    await tx
      .updateTable("oauth_authorization_request")
      .set({ consumed_at: now, updated_at: now })
      .where("oauth_client_id", "=", clientId)
      .where("consumed_at", "is", null)
      .execute();

    return withRedirectUris(
      updatedClient,
      await listRedirectUris(tx, clientId),
    );
  });
}

async function lockOAuthClient(tx: Transaction<DB>, clientId: string) {
  return await tx
    .selectFrom("oauth_client")
    .select(SAFE_CLIENT_COLUMNS)
    .where("id", "=", clientId)
    .forUpdate()
    .executeTakeFirst();
}

async function listRedirectUris(
  db: Database | Transaction<DB>,
  clientId: string,
) {
  const redirectUris = await db
    .selectFrom("oauth_client_redirect_uri")
    .select("redirect_uri")
    .where("oauth_client_id", "=", clientId)
    .orderBy("redirect_uri")
    .execute();

  return redirectUris.map((row) => row.redirect_uri);
}

async function invalidateRemovedRedirectUris(
  tx: Transaction<DB>,
  clientId: string,
  removedRedirectUris: readonly string[],
  now: Date,
) {
  if (isEmpty(removedRedirectUris)) return;

  await tx
    .updateTable("oauth_authorization_request")
    .set({ consumed_at: now, updated_at: now })
    .where("oauth_client_id", "=", clientId)
    .where("redirect_uri", "in", removedRedirectUris)
    .where("consumed_at", "is", null)
    .execute();

  const clientGrantIds = tx
    .selectFrom("oauth_grant")
    .select("id")
    .where("oauth_client_id", "=", clientId);
  await tx
    .updateTable("oauth_authorization_code")
    .set({ revoked_at: now, updated_at: now })
    .where("oauth_grant_id", "in", clientGrantIds)
    .where("redirect_uri", "in", removedRedirectUris)
    .where("used_at", "is", null)
    .where("revoked_at", "is", null)
    .execute();
}

function withRedirectUris(
  client: SafeClientRow,
  redirectUris: readonly string[],
): OAuthClientDetails {
  return {
    ...client,
    redirect_uris: [...redirectUris].sort(),
  };
}
