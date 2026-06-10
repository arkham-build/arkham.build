import type { SessionResponse } from "@arkham-build/shared";
import { Redirect } from "wouter";
import { AccountDeletion } from "./account-deletion";
import { AccountEmail } from "./account-email";
import { AccountProfile } from "./account-profile";
import { OAuthConnections } from "./connections";
import css from "./settings.module.css";

export function AccountSettings({
  session,
}: {
  session: SessionResponse | null;
}) {
  if (!session) {
    return (
      <Redirect
        to={`/auth/login?redirect=${encodeURIComponent("/settings?tab=account")}`}
      />
    );
  }

  return (
    <>
      <AccountProfile />
      <div className={css["row"]}>
        <AccountEmail />
        <OAuthConnections />
      </div>
      <AccountDeletion />
    </>
  );
}
