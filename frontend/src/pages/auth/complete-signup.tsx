import { PATTERN_VALID_USERNAME } from "@arkham-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useAuthSessionQuery } from "@/queries/auth";
import { useCompleteProfileMutation } from "@/queries/mutations/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";

function SignupArkhamDB() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: session, isLoading } = useAuthSessionQuery();

  const completeProfileMutation = useCompleteProfileMutation();

  const [username, setUsername] = useState("");

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await completeProfileMutation.mutateAsync({ username });
    navigate("/");
  };

  if (isLoading) {
    return <AuthLayout title={t("auth.signup.complete_profile.title")} />;
  }

  if (!session) {
    navigate("~/auth/login");
    return null;
  }

  if (session.account.profileComplete) {
    navigate("~/");
    return null;
  }

  return (
    <AuthLayout
      title={t("auth.signup.complete_profile.title")}
      description={t("auth.signup.complete_profile.description")}
    >
      <AuthForm onSubmit={onSubmit}>
        {completeProfileMutation.error && (
          <ErrorBox>
            {errorMapper(
              completeProfileMutation.error,
              t,
              "auth.errors.signup_failed",
            )}
          </ErrorBox>
        )}

        <Field full helpText={t("auth.username_validation")}>
          <FieldLabel htmlFor="username">{t("auth.username")}</FieldLabel>
          <input
            autoComplete="username"
            disabled={completeProfileMutation.isPending}
            id="username"
            maxLength={64}
            minLength={3}
            pattern={PATTERN_VALID_USERNAME}
            required
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            value={username}
          />
        </Field>

        <Button
          disabled={completeProfileMutation.isPending}
          type="submit"
          variant="primary"
          size="full"
        >
          {t("auth.signup.complete_profile.title")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export default SignupArkhamDB;
