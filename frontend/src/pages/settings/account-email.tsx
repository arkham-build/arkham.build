import type { EmailIdentity, Identity } from "@arkham-build/shared";
import { CheckCircle2Icon, Clock3Icon } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Plane } from "@/components/ui/plane";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast.hooks";
import { ErrorBox } from "@/pages/auth/error-box";
import {
  useCancelPendingEmailChangeMutation,
  useCreateEmailIdentityMutation,
  useUpdateCredentialsMutation,
} from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { Section } from "./section";
import css from "./settings.module.css";

export function AccountEmail() {
  const { t } = useTranslation();
  const session = useStore(selectSession);
  const emailIdentity = session?.identities.find(isEmailIdentity);

  return (
    <Section title={t("settings.account.email.title")}>
      {!emailIdentity && <CreateEmailIdentityForm />}

      {emailIdentity && !emailIdentity.email && (
        <PendingEmailIdentity emailIdentity={emailIdentity} />
      )}

      {emailIdentity?.email && (
        <UpdateCredentialsForm emailIdentity={emailIdentity} />
      )}
    </Section>
  );
}

function CreateEmailIdentityForm() {
  const { t } = useTranslation();
  const toast = useToast();
  const createEmailIdentityMutation = useCreateEmailIdentityMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (evt: React.SubmitEvent<HTMLFormElement>) => {
    evt.preventDefault();

    const toastId = toast.show({
      children: t("settings.account.email.saving"),
      variant: "loading",
    });

    try {
      await createEmailIdentityMutation.mutateAsync({ email, password });
      toast.dismiss(toastId);
      setPassword("");
    } catch {
      toast.dismiss(toastId);
    }
  };

  return (
    <form className={css["account-container"]} onSubmit={onSubmit}>
      {createEmailIdentityMutation.error && (
        <ErrorBox>{createEmailIdentityMutation.error.message}</ErrorBox>
      )}
      <p>{t("settings.account.email.add_help")}</p>
      <Field full>
        <FieldLabel htmlFor="account-email">{t("auth.email")}</FieldLabel>
        <input
          autoComplete="email"
          disabled={createEmailIdentityMutation.isPending}
          id="account-email"
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          value={email}
        />
      </Field>
      <Field full helpText={t("auth.password_validation")}>
        <FieldLabel htmlFor="account-email-password">
          {t("auth.password")}
        </FieldLabel>
        <input
          autoComplete="new-password"
          disabled={createEmailIdentityMutation.isPending}
          id="account-email-password"
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
      </Field>
      <Button
        disabled={createEmailIdentityMutation.isPending}
        type="submit"
        variant="secondary"
      >
        {t("settings.account.email.add")}
      </Button>
    </form>
  );
}

function UpdateCredentialsForm(props: { emailIdentity: EmailIdentity }) {
  const { emailIdentity } = props;
  const { t } = useTranslation();
  const toast = useToast();
  const updateCredentialsMutation = useUpdateCredentialsMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const isPending = updateCredentialsMutation.isPending;

  const isSubmitDisabled =
    isPending || !currentPassword || (!newEmail.trim() && !newPassword);

  const onSubmit = async (evt: React.SubmitEvent<HTMLFormElement>) => {
    evt.preventDefault();

    const toastId = toast.show({
      children: t("settings.account.email.saving"),
      variant: "loading",
    });

    try {
      await updateCredentialsMutation.mutateAsync({
        currentPassword,
        newEmail: newEmail.trim() || undefined,
        newPassword: newPassword || undefined,
      });
      toast.dismiss(toastId);
      setCurrentPassword("");
      setNewEmail("");
      setNewPassword("");
    } catch {
      toast.dismiss(toastId);
    }
  };

  return (
    <form className={css["account-container"]} onSubmit={onSubmit}>
      {updateCredentialsMutation.error && (
        <ErrorBox>{updateCredentialsMutation.error.message}</ErrorBox>
      )}
      <div className={css["account-details"]}>
        <dl className={css["account-details-properties"]}>
          <dt>{t("auth.email")}</dt>
          <dd>{emailIdentity.email}</dd>
          <dt>{t("settings.account.email.status")}</dt>
          <dd>
            <StatusPill
              color="var(--nord-14)"
              icon={<CheckCircle2Icon />}
              testId="account-email-status"
            >
              {t("settings.account.email.status_verified")}
            </StatusPill>
          </dd>
        </dl>
      </div>
      {emailIdentity.pendingEmail && (
        <PendingEmailIdentity emailIdentity={emailIdentity} />
      )}
      <Field full>
        <FieldLabel htmlFor="account-current-password">
          {t("settings.account.email.current_password")}
        </FieldLabel>
        <input
          autoComplete="current-password"
          disabled={isPending}
          id="account-current-password"
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          type="password"
          value={currentPassword}
        />
      </Field>
      <Field full helpText={t("settings.account.email.new_email_help")}>
        <FieldLabel htmlFor="account-new-email">
          {t("settings.account.email.new_email")}
        </FieldLabel>
        <input
          autoComplete="email"
          disabled={isPending}
          id="account-new-email"
          onChange={(e) => setNewEmail(e.target.value)}
          type="email"
          value={newEmail}
        />
      </Field>
      <Field full helpText={t("settings.account.email.new_password_help")}>
        <FieldLabel htmlFor="account-new-password">
          {t("settings.account.email.new_password")}
        </FieldLabel>
        <input
          autoComplete="new-password"
          disabled={isPending}
          id="account-new-password"
          minLength={8}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          value={newPassword}
        />
      </Field>
      <Button disabled={isSubmitDisabled} type="submit" variant="secondary">
        {t("settings.account.email.save")}
      </Button>
    </form>
  );
}

function PendingEmailIdentity({
  emailIdentity,
}: {
  emailIdentity: EmailIdentity;
}) {
  const { t } = useTranslation();
  const toast = useToast();

  const cancelPendingEmailChangeMutation =
    useCancelPendingEmailChangeMutation();

  const onCancelPendingEmailChange = async () => {
    const toastId = toast.show({
      children: t("settings.account.email.canceling_pending"),
      variant: "loading",
    });

    try {
      await cancelPendingEmailChangeMutation.mutateAsync();
    } finally {
      toast.dismiss(toastId);
    }
  };
  return (
    <Plane className={css["pending-email"]} size="sm">
      {cancelPendingEmailChangeMutation.error && (
        <ErrorBox>{cancelPendingEmailChangeMutation.error.message}</ErrorBox>
      )}
      <dl className={css["account-details-properties"]}>
        <dt>{t("auth.email")}</dt>
        <dd>{emailIdentity.pendingEmail}</dd>
        <dt>{t("settings.account.email.status")}</dt>
        <dd>
          <StatusPill
            color="var(--nord-13)"
            icon={<Clock3Icon />}
            testId="account-email-status"
          >
            {t("settings.account.email.status_pending")}
          </StatusPill>
        </dd>
      </dl>
      <p>
        <Trans
          i18nKey="settings.account.email.pending_help"
          values={{ email: emailIdentity.pendingEmail }}
          components={{ verifyLink: <Link href="~/auth/verify-email" /> }}
        />
      </p>
      <Button
        disabled={cancelPendingEmailChangeMutation.isPending}
        onClick={onCancelPendingEmailChange}
        type="button"
        size="none"
        variant="link"
      >
        {t("settings.account.email.cancel_pending")}
      </Button>
    </Plane>
  );
}

function isEmailIdentity(identity: Identity): identity is EmailIdentity {
  return identity.provider === "email";
}
