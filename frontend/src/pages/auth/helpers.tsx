import type { TFunction } from "i18next";
import { Trans } from "react-i18next";
import { Link } from "wouter";
import { ApiError } from "@/store/services/requests/shared";

export function errorMapper(
  error: unknown,
  t: TFunction,
  defaultError: string | ((err: unknown) => string),
) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return t("auth.errors.invalid_credentials");
    }

    if (error.status === 403) {
      return (
        <Trans
          t={t}
          i18nKey="auth.errors.account_not_verified"
          components={{ verifyLink: <Link href="~/auth/verify-email" /> }}
        />
      );
    }

    const retryAfter = getRetryAfter(error.cause);

    if (error.status === 429 && retryAfter) {
      const retryAt = new Date(retryAfter);

      const retrySeconds = Math.max(
        Math.ceil((retryAt.getTime() - Date.now()) / 1000),
        0,
      );

      return t("auth.errors.rate_limited", {
        interval: `${retrySeconds}s`,
      });
    }
  }

  if (typeof defaultError === "function") {
    return defaultError(error);
  }

  return t(defaultError, {
    error: (error as Error).message,
  });
}

export function createPasswordMatchPattern(password: string): string {
  return password.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRetryAfter(cause: unknown): string | null {
  if (
    cause &&
    typeof cause === "object" &&
    "retryAfter" in cause &&
    typeof cause.retryAfter === "string"
  ) {
    return cause.retryAfter;
  }

  return null;
}
