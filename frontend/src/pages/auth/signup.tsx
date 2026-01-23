import { PATTERN_VALID_PASSWORD } from "@arkham-build/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { postSignup } from "@/store/services/requests/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./error-mapper";

function Signup() {
  const { t } = useTranslation();
  const signupMutation = useMutation({
    mutationFn: postSignup,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (evt: React.FormEvent) => {
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
      title={t("auth.signup.title")}
      footer={
        <>
          {t("auth.signup.has_account")}{" "}
          <Link href="/login">{t("auth.login.title")}</Link>
        </>
      }
    >
      <AuthForm onSubmit={onSubmit}>
        {signupMutation.error && (
          <ErrorBox>
            {errorMapper(signupMutation.error, t, "auth.errors.signup_failed")}
          </ErrorBox>
        )}
        <Field full>
          <FieldLabel htmlFor="name">{t("auth.username")}</FieldLabel>
          <input
            autoComplete="name"
            disabled={signupMutation.isPending}
            id="name"
            maxLength={64}
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

        <Button
          disabled={signupMutation.isPending}
          type="submit"
          variant="primary"
          size="full"
        >
          {t("auth.signup.title")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export default Signup;
