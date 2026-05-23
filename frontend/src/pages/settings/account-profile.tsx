import { PATTERN_VALID_USERNAME } from "@arkham-build/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { ErrorBox } from "@/pages/auth/error-box";
import { useAuthSessionQuery } from "@/queries/auth";
import { usePatchProfileMutation } from "@/queries/mutations/profile";

export function AccountProfile() {
  const { t } = useTranslation();
  const { data: session } = useAuthSessionQuery();
  const patchProfileMutation = usePatchProfileMutation();

  const currentUsername = session?.account.name ?? "";
  const [username, setUsername] = useState(currentUsername);

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  const isUnchanged = useMemo(
    () => username.trim() === currentUsername,
    [currentUsername, username],
  );

  const onSave = async () => {
    await patchProfileMutation.mutateAsync({ username: username.trim() });
  };

  return (
    <>
      {patchProfileMutation.error && (
        <ErrorBox>{patchProfileMutation.error.message}</ErrorBox>
      )}
      <Field full helpText={t("settings.account.profile.username_help")}>
        <FieldLabel htmlFor="profile-username">
          {t("settings.account.profile.username")}
        </FieldLabel>
        <input
          autoComplete="username"
          disabled={patchProfileMutation.isPending}
          id="profile-username"
          maxLength={64}
          minLength={3}
          pattern={PATTERN_VALID_USERNAME}
          required
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          value={username}
        />
      </Field>
      <Button
        disabled={patchProfileMutation.isPending || isUnchanged || !session}
        onClick={onSave}
        variant="primary"
      >
        {t("settings.account.profile.save")}
      </Button>
    </>
  );
}
