import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { postForgotPassword } from "@/store/services/requests/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const { t } = useTranslation();

  const forgotPasswordMutation = useMutation({
    mutationFn: postForgotPassword,
  });

  const onSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    await forgotPasswordMutation.mutateAsync({ email });
  };

  if (forgotPasswordMutation.isSuccess) {
    return (
      <AuthLayout
        title={t("auth.forgot_password.title")}
        description={
          <>
            <div>{t("auth.forgot_password.success")}</div>
            <Link href="/login" asChild>
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
        <Link href="/login" asChild>
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
          <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
          <input
            autoComplete="email"
            disabled={forgotPasswordMutation.isPending}
            id="email"
            required
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
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
