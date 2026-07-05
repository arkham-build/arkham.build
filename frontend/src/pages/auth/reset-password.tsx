import { PATTERN_VALID_PASSWORD } from "@arkham-build/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast.hooks";
import { useResetPasswordMutation } from "@/queries/mutations/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { createPasswordMatchPattern, errorMapper } from "./helpers";

function ResetPassword() {
  const { t } = useTranslation();
  const toast = useToast();
  const [, navigate] = useLocation();
  const token = useResetToken();

  const resetPasswordMutation = useResetPasswordMutation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();

    try {
      await resetPasswordMutation.mutateAsync({ token, password });

      toast.show({
        children: t("auth.reset_password.success"),
        variant: "success",
        duration: 5000,
      });

      navigate("/auth/login");
    } catch (error) {
      toast.show({
        children: t("auth.errors.password_reset_failed", {
          error: String(error),
        }),
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <AuthLayout title={t("auth.reset_password.title")}>
      <AuthForm onSubmit={onSubmit}>
        {resetPasswordMutation.error && (
          <ErrorBox>
            {errorMapper(
              resetPasswordMutation.error,
              t,
              "auth.errors.forgot_password_failed",
            )}
          </ErrorBox>
        )}
        <Field full helpText={t("auth.password_validation")}>
          <FieldLabel htmlFor="password">
            {t("auth.reset_password.password")}
          </FieldLabel>
          <input
            autoComplete="new-password"
            disabled={resetPasswordMutation.isPending}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            pattern={PATTERN_VALID_PASSWORD}
            required
            type="password"
            value={password}
          />
        </Field>

        <Field full>
          <FieldLabel htmlFor="confirm-password">
            {t("auth.reset_password.confirm_password")}
          </FieldLabel>
          <input
            autoComplete="new-password"
            disabled={resetPasswordMutation.isPending}
            id="confirm-password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            pattern={createPasswordMatchPattern(password)}
            required
            type="password"
            value={confirmPassword}
          />
        </Field>

        <Button
          disabled={resetPasswordMutation.isPending}
          type="submit"
          variant="primary"
          full
        >
          {t("auth.reset_password.title")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export default ResetPassword;

function useResetToken() {
  const [token] = useState(readResetToken);

  useEffect(() => {
    removeResetTokenFromUrl();
  }, []);

  return token;
}

function readResetToken() {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));

  const hashToken = hashParams.get("token");
  return hashToken ?? "";
}

function removeResetTokenFromUrl() {
  const url = new URL(window.location.href);

  if (new URLSearchParams(url.hash.slice(1)).has("token")) {
    url.hash = "";
  }

  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
