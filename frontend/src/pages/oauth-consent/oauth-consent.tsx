import {
  OAuthAuthorizationRequestTokenSchema,
  type OAuthConsentDetailsResponse,
} from "@arkham-build/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Notice } from "@/components/ui/notice";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { useHttpClient } from "@/store/services/http-client.context";
import { ApiError } from "@/store/services/requests/shared";
import { OAUTH_SCOPE_TRANSLATION_KEYS } from "@/utils/oauth-scopes";
import { AuthLayout } from "../auth/auth-layout";
import { createAuthRedirectPath, getCurrentLocalPath } from "../auth/return-to";
import css from "./oauth-consent.module.css";
import { claimOAuthAuthorizationRequest } from "./requests";

type OAuthConsentDecision = "approve" | "deny";

export type OAuthConsentViewProps =
  | { state: "error" }
  | { state: "expired" }
  | { state: "loading" }
  | { state: "unauthenticated" }
  | {
      details: OAuthConsentDetailsResponse;
      onDecision: (decision: OAuthConsentDecision) => void;
      pendingDecision?: OAuthConsentDecision;
      state: "ready";
    };

export function OAuthConsentView(props: OAuthConsentViewProps) {
  const { t } = useTranslation();

  if (props.state === "loading" || props.state === "unauthenticated") {
    return (
      <AuthLayout title={t("oauth_consent.title")}>
        <div data-testid={`oauth-consent-${props.state}`}>
          <Loader
            message={
              props.state === "loading"
                ? t("oauth_consent.loading")
                : t("oauth_consent.redirecting_to_login")
            }
            show
          />
        </div>
      </AuthLayout>
    );
  }

  if (props.state === "expired" || props.state === "error") {
    return (
      <AuthLayout title={t("oauth_consent.title")}>
        <div data-testid={`oauth-consent-${props.state}`}>
          <Notice variant="warning">
            {t(
              props.state === "expired"
                ? "oauth_consent.expired"
                : "oauth_consent.error",
            )}
          </Notice>
        </div>
      </AuthLayout>
    );
  }

  const { details, onDecision, pendingDecision } = props;

  return (
    <AuthLayout
      title={t("oauth_consent.authorize", {
        clientName: details.client.name,
      })}
      description={t("oauth_consent.description", {
        clientName: details.client.name,
      })}
    >
      <div data-testid="oauth-consent-ready">
        <h2 className={css["permissions-title"]}>
          {t("oauth_consent.permissions")}
        </h2>
        <ul className={css["permissions"]}>
          {details.scopes.map((scope) => {
            const keys = OAUTH_SCOPE_TRANSLATION_KEYS[scope];
            return (
              <li key={scope}>
                <strong>{t(keys.title)}</strong>
                <span>{t(keys.description)}</span>
              </li>
            );
          })}
        </ul>
        <div className={css["actions"]}>
          <Button
            disabled={pendingDecision != null}
            onClick={() => onDecision("approve")}
            variant="primary"
            full
          >
            {t("oauth_consent.allow")}
          </Button>
          <Button
            disabled={pendingDecision != null}
            onClick={() => onDecision("deny")}
            variant="secondary"
            full
          >
            {t("oauth_consent.deny")}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

function OAuthConsent() {
  const client = useHttpClient();
  const [, navigate] = useLocation();
  const search = useSearch();

  const authStatus = useStore((state) => state.auth.status);
  const session = useStore(selectSession);

  const [pendingDecision, setPendingDecision] =
    useState<OAuthConsentDecision>();

  const [consentReturnTo] = useState(getCurrentLocalPath);

  const requestTokenResult = OAuthAuthorizationRequestTokenSchema.safeParse(
    new URLSearchParams(search).get("request"),
  );

  const requestToken = requestTokenResult.success
    ? requestTokenResult.data
    : undefined;

  const canClaim =
    authStatus === "authenticated" &&
    session?.account.profileComplete === true &&
    requestToken != null;

  const consentQuery = useQuery({
    queryKey: ["oauth", "authorization-request", requestToken],
    queryFn: () => {
      if (!requestToken) {
        throw new Error("OAuth authorization request token is missing");
      }

      return claimOAuthAuthorizationRequest(client, requestToken);
    },
    enabled: canClaim,
    retry: false,
  });

  useEffect(() => {
    if (authStatus !== "unauthenticated" || !requestToken) return;

    navigate(createAuthRedirectPath("/auth/login", consentReturnTo), {
      replace: true,
    });
  }, [authStatus, consentReturnTo, navigate, requestToken]);

  if (!requestTokenResult.success) {
    return <OAuthConsentView state="error" />;
  }

  if (authStatus === "idle" || authStatus === "loading") {
    return <OAuthConsentView state="loading" />;
  }

  if (authStatus === "unauthenticated") {
    return <OAuthConsentView state="unauthenticated" />;
  }

  if (!canClaim || consentQuery.isPending) {
    return <OAuthConsentView state="loading" />;
  }

  if (consentQuery.isError) {
    return (
      <OAuthConsentView
        state={
          consentQuery.error instanceof ApiError &&
          consentQuery.error.status === 400
            ? "expired"
            : "error"
        }
      />
    );
  }

  const onDecision = (decision: OAuthConsentDecision) => {
    setPendingDecision(decision);
    const token = OAuthAuthorizationRequestTokenSchema.parse(requestToken);

    const action = new URL(
      `/v2/account/oauth/authorization-requests/${token}/${decision}`,
      import.meta.env.VITE_API_URL,
    );

    const form = document.createElement("form");
    form.action = action.toString();
    form.hidden = true;
    form.method = "POST";
    document.body.append(form);

    form.submit();
  };

  return (
    <OAuthConsentView
      details={consentQuery.data}
      onDecision={onDecision}
      pendingDecision={pendingDecision}
      state="ready"
    />
  );
}

export default OAuthConsent;
