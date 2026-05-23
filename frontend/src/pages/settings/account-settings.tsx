import { useTranslation } from "react-i18next";
import { AccountProfile } from "./account-profile";
import { Section } from "./section";

export function AccountSettings() {
  const { t } = useTranslation();

  return (
    <Section title={t("settings.account.profile.title")}>
      <AccountProfile />
    </Section>
  );
}
