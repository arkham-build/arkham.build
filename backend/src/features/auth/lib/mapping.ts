import assert from "node:assert";
import {
  type ArkhamDBIdentity,
  type ArkhamDbIdentityState,
  ArkhamDbIdentityStateSchema,
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
  | "state"
  | "verified_at"
>;

type SessionAccount = Pick<
  Selectable<Account>,
  "id" | "name" | "profile_completed_at"
>;

export function mapAccountSessionToResponse(
  account: SessionAccount,
  identities: AccountIdentitySummary[],
  canDisconnect: boolean,
) {
  return SessionResponseSchema.parse({
    account: {
      id: account.id,
      name: account.name,
      profileComplete: account.profile_completed_at != null,
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

      const arkhamdbIdentity = mapArkhamDbAccountIdentityToIdentity(
        identity,
        canDisconnect,
      );

      if (arkhamdbIdentity) return arkhamdbIdentity;

      assert(
        identity.provider_user_id,
        "OAuth identity is missing provider_user_id",
      );

      return {
        provider: identity.provider,
        providerUserId: identity.provider_user_id,
        canDisconnect,
      };
    }),
  });
}

export function mapArkhamDbAccountIdentityToIdentity(
  identity: AccountIdentitySummary,
  canDisconnect: boolean,
): ArkhamDBIdentity | null {
  if (identity.provider !== "arkhamdb") {
    return null;
  }

  assert(
    identity.provider_user_id,
    "OAuth identity is missing provider_user_id",
  );

  const state = parseArkhamDbIdentityState(identity.state);

  return {
    provider: "arkhamdb",
    providerUserId: identity.provider_user_id,
    canDisconnect,
    details: {
      lastError: state.lastError ?? null,
      lastSyncedAt: state.lastSyncedAt ?? null,
      status: state.status,
      username: state.username ?? null,
    },
  };
}

export function parseArkhamDbIdentityState(
  state: AccountIdentity["state"],
): ArkhamDbIdentityState {
  const parsed = ArkhamDbIdentityStateSchema.safeParse(state);

  if (!parsed.success) {
    return {
      lastError: null,
      lastSyncedAt: null,
      status: "healthy",
      username: null,
    };
  }

  return parsed.data;
}
