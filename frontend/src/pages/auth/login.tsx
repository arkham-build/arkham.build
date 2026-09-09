import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordInput } from "@/components/ui/password-input";
import { useLoginMutation } from "@/queries/mutations/auth";
import { ApiError } from "@/store/services/requests/shared";
import { ARKHAMDB_WARNING_VISIBLE } from "@/utils/constants";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";
import css from "./login.module.css";
import { createAuthRedirectPath, getLocalReturnPath } from "./return-to";
import { OAuthSeparator } from "./oauth-separator";

function Login() {
  const [, navigate] = useLocation();

  const search = useSearch();
  const { t } = useTranslation();

  const loginMutation = useLoginMutation();
  const returnTo = getLocalReturnPath(
    new URLSearchParams(search).get("redirect"),
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await loginMutation.mutateAsync({ email, password });
    navigate(returnTo);
  };

  return (
    <AuthLayout
      title={t("auth.login.title")}
      footer={
        <>
          {t("auth.login.no_account")}{" "}
          <Link href={createAuthRedirectPath("/auth/signup", returnTo)}>
            {t("auth.signup.action")}
          </Link>
        </>
      }
    >
      <AuthForm onSubmit={onSubmit}>
        {loginMutation.error && (
          <ErrorBox>
            {errorMapper(loginMutation.error, t, (err) => {
              if (err instanceof ApiError && err.status === 401) {
                return t("auth.errors.invalid_credentials");
              }

              return t("auth.errors.login_failed", {
                error: (err as Error).message,
              });
            })}
          </ErrorBox>
        )}

        <Field full>
          <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
          <input
            autoComplete="email"
            disabled={loginMutation.isPending}
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="randall@tillinghast-esoterica.com"
            required
            type="email"
            value={email}
          />
        </Field>

        <Field full>
          <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
          <PasswordInput
            autoComplete="current-password"
            disabled={loginMutation.isPending}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            value={password}
          />
        </Field>

        <div className={css["forgot-link"]}>
          <Link href="/auth/forgot-password">
            {t("auth.login.forgot_password")}
          </Link>
        </div>

        <Button
          disabled={loginMutation.isPending}
          type="submit"
          variant="primary"
          full
        >
          {t("auth.login.action")}
        </Button>

        <OAuthSeparator />
        {ARKHAMDB_WARNING_VISIBLE && (
          <Notice variant="warning">{t("auth.arkhamdb_login_banner")}</Notice>
        )}
        <Button
          as="a"
          href={getArkhamDbLoginHref(returnTo)}
          variant="secondary"
          full
        >
          <i className="icon-elder_sign" />
          {t("auth.login.with_arkhamdb")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

function getArkhamDbLoginHref(returnTo: string) {
  const url = new URL("/auth/arkhamdb/login", import.meta.env.VITE_API_URL);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export default Login;
