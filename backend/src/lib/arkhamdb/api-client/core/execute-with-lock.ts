import { ArkhamDbIdentityStateSchema } from "@arkham-build/shared";
import { Mutex } from "async-mutex";
import type { Context } from "hono";
import type { Database } from "../../../../db/db.ts";
import {
  getAccountIdentityByAccountIdAndProvider,
  updateAccountIdentityState,
} from "../../../auth/account-identities.ts";
import { findArkhamDbIdentityWithTokenByAccountId } from "../../../auth/oauth-tokens.ts";
import type { SessionAuthHonoEnv } from "../../../hono-env.ts";

export type ArkhamDbExecutor = {
  connection: NonNullable<
    Awaited<ReturnType<typeof findArkhamDbIdentityWithTokenByAccountId>>
  >;
  context: Context<SessionAuthHonoEnv>;
  db: Database;
};

export async function withArkhamDbExecutor<T>(
  c: Context<SessionAuthHonoEnv>,
  run: (executor: ArkhamDbExecutor) => Promise<T>,
): Promise<T> {
  const db = c.get("db");
  const accountId = c.get("account").id;
  const initialConnection = await findArkhamDbIdentityWithTokenByAccountId(
    db,
    accountId,
  );

  if (!initialConnection) {
    throw await markArkhamDbConnectionMissing(db, accountId);
  }

  return await withArkhamDbUserLock(initialConnection.identity.id, async () => {
    const connection = await findArkhamDbIdentityWithTokenByAccountId(
      db,
      accountId,
    );

    if (!connection) {
      throw await markArkhamDbConnectionMissing(db, accountId);
    }

    return await run({
      connection,
      context: c,
      db,
    });
  });
}

const arkhamDbUserLocks = new Map<string, Mutex>();

async function markArkhamDbConnectionMissing(db: Database, accountId: string) {
  const message = "Missing ArkhamDB identity or OAuth token for account.";
  const identity = await getAccountIdentityByAccountIdAndProvider(
    db,
    accountId,
    "arkhamdb",
  );

  if (identity) {
    const parsed = ArkhamDbIdentityStateSchema.safeParse(identity.state);
    const state = parsed.success
      ? parsed.data
      : {
          lastError: null,
          lastSyncedAt: null,
          status: "healthy" as const,
          username: null,
        };

    await updateAccountIdentityState(db, identity.id, {
      ...state,
      lastError: message,
      status: "unhealthy",
    });
  }

  return new Error(message);
}

async function withArkhamDbUserLock<T>(
  identityId: string,
  run: () => Promise<T>,
) {
  let mutex: Mutex;
  if (arkhamDbUserLocks.has(identityId)) {
    mutex = arkhamDbUserLocks.get(identityId) as Mutex;
  } else {
    mutex = new Mutex();
    arkhamDbUserLocks.set(identityId, mutex);
  }

  try {
    return await mutex.runExclusive(run);
  } finally {
    if (arkhamDbUserLocks.get(identityId) === mutex && !mutex.isLocked()) {
      arkhamDbUserLocks.delete(identityId);
    }
  }
}
