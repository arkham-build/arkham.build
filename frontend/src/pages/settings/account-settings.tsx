import { AccountProfile } from "./account-profile";
import { OAuthConnections } from "./connections";

export function AccountSettings() {
  return (
    <>
      <AccountProfile />
      <OAuthConnections />
    </>
  );
}
