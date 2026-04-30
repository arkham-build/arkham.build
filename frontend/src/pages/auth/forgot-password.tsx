import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useForgotPasswordMutation } from "@/queries/mutations/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";

function ForgotPassword() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const { t } = useTranslation();

  const forgotPasswordMutation = useForgotPasswordMutation();

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await forgotPasswordMutation.mutateAsync({ emailOrUsername });
  };

  if (forgotPasswordMutation.isSuccess) {
    return (
      <AuthLayout
        title={t("auth.forgot_password.title")}
        description={
          <>
            <div>{t("auth.forgot_password.success")}</div>
            <Link href="/auth/login" asChild>
              <Button as="a" variant="primary" size="full">
                {t("auth.login.title")}
              </Button>
            </Link>
          </>
        }
      />
    );
  }

  return (
    <AuthLayout
      footer={
        <Link href="/auth/login" asChild>
          <Button as="a" variant="bare" size="sm">
            {t("auth.login.title")}
          </Button>
        </Link>
      }
      title={t("auth.forgot_password.title")}
      description={t("auth.forgot_password.description")}
    >
      <AuthForm onSubmit={onSubmit}>
        {forgotPasswordMutation.error && (
          <ErrorBox>
            {errorMapper(
              forgotPasswordMutation.error,
              t,
              "auth.errors.forgot_password_failed",
            )}
          </ErrorBox>
        )}
        <Field full>
          <FieldLabel htmlFor="emailOrUsername">
            {t("auth.email_or_username")}
          </FieldLabel>
          <input
            autoComplete="username"
            disabled={forgotPasswordMutation.isPending}
            id="emailOrUsername"
            required
            onChange={(e) => setEmailOrUsername(e.target.value)}
            type="text"
            value={emailOrUsername}
          />
        </Field>

        <Button
          disabled={forgotPasswordMutation.isPending}
          type="submit"
          variant="primary"
          size="full"
        >
          {t("auth.forgot_password.submit")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export default ForgotPassword;
