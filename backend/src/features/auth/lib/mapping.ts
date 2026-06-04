import assert from "node:assert";
import {
  type ArkhamDBIdentity,
  SessionResponseSchema,
} from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { Account, AccountIdentity } from "../../../db/schema.types.ts";

type AccountIdentitySummary = Pick<
  Selectable<AccountIdentity>,
  | "created_at"
  | "email"
  | "pending_email"
  | "provider"
  | "provider_user_id"
  | "verified_at"
>;

type SessionAccount = Pick<Selectable<Account>, "id" | "name">;

export function mapAccountSessionToResponse(
  account: SessionAccount,
  identities: AccountIdentitySummary[],
) {
  return SessionResponseSchema.parse({
    account: {
      id: account.id,
      name: account.name,
    },
    identities: identities.map((identity) => {
      if (identity.provider === "email") {
        return {
          provider: "email" as const,
          email: identity.email,
          pendingEmail: identity.pending_email,
          verified: identity.verified_at != null,
        };
      }

      const arkhamdbIdentity = mapArkhamDbAccountIdentityToIdentity(identity);

      if (arkhamdbIdentity) {
        return arkhamdbIdentity;
      }

      assert(
        identity.provider_user_id,
        "OAuth identity is missing provider_user_id",
      );

      return {
        provider: identity.provider,
        providerUserId: identity.provider_user_id,
      };
    }),
  });
}

export function mapArkhamDbAccountIdentityToIdentity(
  identity: AccountIdentitySummary,
): ArkhamDBIdentity | null {
  if (identity.provider !== "arkhamdb") {
    return null;
  }

  assert(
    identity.provider_user_id,
    "OAuth identity is missing provider_user_id",
  );

  return {
    provider: "arkhamdb",
    providerUserId: identity.provider_user_id,
    details: {
      status: "healthy",
      createdAt: identity.created_at.toISOString(),
      lastSyncedAt: null,
      username: null,
    },
  };
}
