import type { Transaction } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { DB } from "../../../db/schema.types.ts";
import { verifyOAuthClientSecret } from "../../../lib/oauth/crypto.ts";
import { OAuthTokenError } from "./errors.ts";

export async function verifyOAuthClientCredentials(
  db: Database,
  input: { clientId: string; clientSecret: string },
) {
  const client = await db
    .selectFrom("oauth_client")
    .select("secret_hash")
    .where("id", "=", input.clientId)
    .executeTakeFirst();

  if (
    !client ||
    !(await verifyOAuthClientSecret(input.clientSecret, client.secret_hash))
  ) {
    throw invalidOAuthClient();
  }

  return client.secret_hash;
}

export async function lockActiveOAuthClient(
  tx: Transaction<DB>,
  clientId: string,
  verifiedSecretHash: string,
) {
  const client = await tx
    .selectFrom("oauth_client")
    .select(["disabled_at", "secret_hash"])
    .where("id", "=", clientId)
    .forShare()
    .executeTakeFirst();

  if (!client || client.secret_hash !== verifiedSecretHash) {
    throw invalidOAuthClient();
  }

  if (client.disabled_at != null) {
    throw new OAuthTokenError("unauthorized_client", "Client is disabled");
  }
}

function invalidOAuthClient() {
  return new OAuthTokenError(
    "invalid_client",
    "Client authentication failed",
    401,
  );
}
