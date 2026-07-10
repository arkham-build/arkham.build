import { PATTERN_VALID_PASSWORD } from "@arkham-build/shared";
import { useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useSignupMutation } from "@/queries/mutations/auth";
import { ARKHAMDB_WARNING_VISIBLE } from "@/utils/constants";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { createPasswordMatchPattern, errorMapper } from "./helpers";
import { OAuthSeparator } from "./oauth-separator";
import css from "./signup.module.css";
import { Turnstile } from "./turnstile";

function Signup() {
  const { t } = useTranslation();
  const signupMutation = useSignupMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const onTurnstileChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await signupMutation.mutateAsync({
      email,
      password,
      captchaToken: captchaToken ?? undefined,
    });
  };

  if (signupMutation.isSuccess) {
    return (
      <AuthLayout
        title={t("auth.signup.title")}
        description={t("auth.signup.success")}
      />
    );
  }

  return (
    <AuthLayout
      title={t("auth.signup.title")}
      footer={
        <>
          {t("auth.signup.has_account")}{" "}
          <Link href="/auth/login">{t("auth.login.action")}</Link>
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
          <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
          <input
            autoComplete="email"
            disabled={signupMutation.isPending}
            id="email"
            required
            onChange={(e) => setEmail(e.target.value)}
            placeholder="randall@tillinghast-esoterica.com"
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
            placeholder="••••••••"
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
            placeholder="••••••••"
            type="password"
            value={confirmPassword}
          />
        </Field>

        {turnstileSiteKey && (
          <Turnstile onChange={onTurnstileChange} siteKey={turnstileSiteKey} />
        )}

        <p className={css["legal-copy"]}>
          <Trans
            i18nKey="auth.signup.legal_acceptance"
            t={t}
            components={{
              terms: <a href="/terms">{t("footer.terms")}</a>,
              privacy: <a href="/privacy">{t("footer.privacy")}</a>,
            }}
          />
        </p>

        <Button
          disabled={
            signupMutation.isPending ||
            (Boolean(turnstileSiteKey) && !captchaToken)
          }
          type="submit"
          variant="primary"
          full
        >
          {turnstileSiteKey && !captchaToken
            ? t("auth.signup.verifying")
            : t("auth.signup.action")}
        </Button>

        <OAuthSeparator />
        {ARKHAMDB_WARNING_VISIBLE && (
          <Notice variant="warning">{t("auth.arkhamdb_signup_banner")}</Notice>
        )}
        <Button
          as="a"
          href={`${import.meta.env.VITE_API_URL}/auth/arkhamdb/signup`}
          variant="secondary"
          full
        >
          <i className="icon-elder_sign" />
          {t("auth.signup.with_arkhamdb")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export default Signup;
