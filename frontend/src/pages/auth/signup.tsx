import {
  PATTERN_VALID_PASSWORD,
  PATTERN_VALID_USERNAME,
} from "@arkham-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useSignupMutation } from "@/queries/mutations/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { createPasswordMatchPattern, errorMapper } from "./helpers";
import { OAuthSeparator } from "./oauth-separator";

function Signup() {
  const { t } = useTranslation();
  const signupMutation = useSignupMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await signupMutation.mutateAsync({ name, email, password });
  };

  if (signupMutation.isSuccess) {
    return (
      <AuthLayout
        title={t("auth.signup.title")}
        description={
          <>
            {t("auth.signup.success")}
            <br />
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
      title={t("auth.signup.title")}
      footer={
        <>
          {t("auth.signup.has_account")}{" "}
          <Link href="/auth/login">{t("auth.login.title")}</Link>
        </>
      }
    >
      <AuthForm onSubmit={onSubmit}>
        {signupMutation.error && (
          <ErrorBox>
            {errorMapper(signupMutation.error, t, "auth.errors.signup_failed")}
          </ErrorBox>
        )}
        <Field full helpText={t("auth.username_validation")}>
          <FieldLabel htmlFor="name">{t("auth.username")}</FieldLabel>
          <input
            autoComplete="name"
            disabled={signupMutation.isPending}
            id="name"
            maxLength={64}
            pattern={PATTERN_VALID_USERNAME}
            required
            onChange={(e) => setName(e.target.value)}
            type="text"
            value={name}
          />
        </Field>

        <Field full>
          <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
          <input
            autoComplete="email"
            disabled={signupMutation.isPending}
            id="email"
            required
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
        </Field>

        <Field full helpText={t("auth.password_validation")}>
          <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
          <input
            autoComplete="new-password"
            disabled={signupMutation.isPending}
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
            disabled={signupMutation.isPending}
            id="confirm-password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            pattern={createPasswordMatchPattern(password)}
            required
            type="password"
            value={confirmPassword}
          />
        </Field>

        <Button
          disabled={signupMutation.isPending}
          type="submit"
          variant="primary"
          size="full"
        >
          {t("auth.signup.title")}
        </Button>

        <OAuthSeparator />

        <Button
          as="a"
          href={`${import.meta.env.VITE_API_URL}/auth/arkhamdb`}
          variant="secondary"
          size="full"
        >
          <i className="icon-elder_sign" />
          {t("auth.signup.with_arkhamdb")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export default Signup;
