import {
  OAUTH_CONNECTIONS,
  PATTERN_VALID_USERNAME,
} from "@arkham-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useAuthSessionQuery } from "@/queries/auth";
import { useCompleteProfileOnboardingMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { isSyncedStorageProvider } from "@/store/lib/sync";
import { OAuthConnectionCard } from "../settings/connections";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import css from "./complete-signup.module.css";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";

function SignupArkhamDB() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: session, isLoading } = useAuthSessionQuery();
  const hasLocalDecks = useStore(selectHasLocalDecks);

  const completeProfileOnboardingMutation =
    useCompleteProfileOnboardingMutation();

  const [username, setUsername] = useState("");
  const [uploadDecks, setUploadDecks] = useState(hasLocalDecks);
  const [uploadSettings, setUploadSettings] = useState(true);

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await completeProfileOnboardingMutation.mutateAsync({
      username,
      uploadDecks: hasLocalDecks && uploadDecks,
      uploadSettings,
    });
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

  const shouldShowArkhamDBConnection = session.identities.some(
    (identity) => identity.provider === "email",
  );

  return (
    <AuthLayout
      title={t("auth.signup.complete_profile.title")}
      description={t("auth.signup.complete_profile.description")}
    >
      <AuthForm onSubmit={onSubmit}>
        {completeProfileOnboardingMutation.error && (
          <ErrorBox>
            {errorMapper(
              completeProfileOnboardingMutation.error,
              t,
              "auth.errors.signup_failed",
            )}
          </ErrorBox>
        )}

        <Field full helpText={t("auth.username_validation")}>
          <FieldLabel htmlFor="username">{t("auth.username")}</FieldLabel>
          <input
            autoComplete="username"
            disabled={completeProfileOnboardingMutation.isPending}
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

        <section className={css["wrapper"]}>
          <h3>{t("auth.signup.complete_profile.upload.title")}</h3>
          {hasLocalDecks && (
            <Field
              bordered
              helpText={t("auth.signup.complete_profile.upload.decks.help")}
            >
              <Checkbox
                checked={uploadDecks}
                data-testid="upload-decks"
                disabled={completeProfileOnboardingMutation.isPending}
                id="upload-decks"
                label={t("auth.signup.complete_profile.upload.decks.label")}
                onCheckedChange={setUploadDecks}
              />
            </Field>
          )}

          <Field
            bordered
            helpText={t("auth.signup.complete_profile.upload.settings.help")}
          >
            <Checkbox
              checked={uploadSettings}
              disabled={completeProfileOnboardingMutation.isPending}
              id="upload-settings"
              label={t("auth.signup.complete_profile.upload.settings.label")}
              onCheckedChange={setUploadSettings}
            />
          </Field>
        </section>

        {shouldShowArkhamDBConnection &&
          OAUTH_CONNECTIONS.filter(
            (connection) => connection.provider === "arkhamdb",
          ).map((connection) => (
            <OAuthConnectionCard
              connection={connection}
              key={connection.provider}
              returnTo="/auth/signup/complete"
              variant="onboarding"
            />
          ))}

        <Button
          disabled={completeProfileOnboardingMutation.isPending}
          type="submit"
          variant="primary"
          full
        >
          {t("auth.signup.complete_profile.title")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

function selectHasLocalDecks(state: ReturnType<typeof useStore.getState>) {
  return Object.values(state.data.decks).some(
    (deck) => !isSyncedStorageProvider(deck.source),
  );
}

export default SignupArkhamDB;
