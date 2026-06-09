import { PATTERN_VALID_USERNAME } from "@arkham-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast.hooks";
import { ErrorBox } from "@/pages/auth/error-box";
import { usePatchProfileMutation } from "@/queries/mutations/profile";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { Section } from "./section";
import css from "./settings.module.css";

export function AccountProfile() {
  const { t } = useTranslation();
  const toast = useToast();
  const patchProfileMutation = usePatchProfileMutation();

  const session = useStore(selectSession);

  const [username, setUsername] = useState(session?.account?.name ?? "");

  const onSave = async (evt: React.SubmitEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const toastId = toast.show({
      children: t("settings.account.profile.saving"),
      variant: "loading",
    });

    try {
      await patchProfileMutation.mutateAsync({ username: username.trim() });
      toast.dismiss(toastId);
    } catch (error) {
      toast.dismiss(toastId);
      throw error;
    }
  };

  return (
    <Section title={t("settings.account.profile.title")}>
      <form className={css["account-container"]} onSubmit={onSave}>
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
          disabled={patchProfileMutation.isPending}
          id="profile-submit"
          variant="secondary"
          type="submit"
        >
          {t("settings.account.profile.save")}
        </Button>
      </form>
    </Section>
  );
}
