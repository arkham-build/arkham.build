import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast.hooks";
import { ErrorBox } from "@/pages/auth/error-box";
import { useDeleteAccountMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { Section } from "./section";
import css from "./settings.module.css";

export function AccountPrivacy() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const toast = useToast();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const session = useStore(selectSession);
  const deleteAccountMutation = useDeleteAccountMutation();
  const [confirmation, setConfirmation] = useState("");

  const username = session?.account.name ?? "";
  const canSubmit =
    confirmation === username && !deleteAccountMutation.isPending;

  const onSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();

    const toastId = toast.show({
      children: t("settings.account.delete.deleting"),
      variant: "loading",
    });

    try {
      await deleteAccountMutation.mutateAsync();
      toast.dismiss(toastId);
      navigate("/");
    } catch {
      toast.dismiss(toastId);
    }
  };

  return (
    <Section title={t("settings.account.privacy_rights.title")}>
      <Notice variant="info">
        <p>
          <Trans
            i18nKey="settings.account.privacy_rights.body"
            t={t}
            components={{
              privacyEmail: <a href={`mailto:${adminEmail}`}>{adminEmail}</a>,
            }}
            values={{
              adminEmail,
            }}
          />
        </p>
      </Notice>
      <details className={css["danger-zone"]}>
        <summary>{t("settings.account.danger_zone")}</summary>
        <form className={css["account-container"]} onSubmit={onSubmit}>
          <h3>{t("settings.account.delete.title")}</h3>
          {deleteAccountMutation.error && (
            <ErrorBox>{deleteAccountMutation.error.message}</ErrorBox>
          )}
          <p className={css["account-delete-help"]}>
            {t("settings.account.delete.help")}
          </p>
          <Field
            full
            helpText={t("settings.account.delete.confirm_help", {
              username,
            })}
          >
            <FieldLabel htmlFor="delete-account-confirmation">
              {t("settings.account.delete.confirm_label")}
            </FieldLabel>
            <input
              autoComplete="off"
              disabled={deleteAccountMutation.isPending}
              id="delete-account-confirmation"
              onChange={(evt) => setConfirmation(evt.target.value)}
              required
              type="text"
              value={confirmation}
            />
          </Field>
          <Button disabled={!canSubmit} type="submit" variant="danger">
            {t("settings.account.delete.submit")}
          </Button>
        </form>
      </details>
    </Section>
  );
}
