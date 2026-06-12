import type { SessionResponse } from "@arkham-build/shared";
import { Redirect } from "wouter";
import { useStore } from "@/store";
import { AccountEmail } from "./account-email";
import { AccountPrivacy } from "./account-privacy";
import { AccountProfile } from "./account-profile";
import { OAuthConnections } from "./connections";
import css from "./settings.module.css";

export function AccountSettings({
  session,
}: {
  session: SessionResponse | null;
}) {
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);

  if (!session) {
    return sessionInitialized ? (
      <Redirect
        to={`/auth/login?redirect=${encodeURIComponent("/settings?tab=account")}`}
      />
    ) : null;
  }

  return (
    <>
      <div className={css["row"]}>
        <AccountProfile />
        <AccountEmail />
      </div>
      <div className={css["row"]}>
        <OAuthConnections />
        <AccountPrivacy />
      </div>
    </>
  );
}
