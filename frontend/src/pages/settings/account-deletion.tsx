import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast.hooks";
import { ErrorBox } from "@/pages/auth/error-box";
import { useDeleteAccountMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { cx } from "@/utils/cx";
import { Section } from "./section";
import css from "./settings.module.css";

export function AccountDeletion() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const toast = useToast();
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
    <Section title={t("settings.account.delete.title")}>
      <form
        className={cx(css["account-container"], css["account-delete"])}
        onSubmit={onSubmit}
      >
        {deleteAccountMutation.error && (
          <ErrorBox>{deleteAccountMutation.error.message}</ErrorBox>
        )}
        <p>{t("settings.account.delete.help")}</p>
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
        <Button disabled={!canSubmit} type="submit" variant="secondary">
          {t("settings.account.delete.submit")}
        </Button>
      </form>
    </Section>
  );
}
